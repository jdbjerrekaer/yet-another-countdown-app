import Foundation
import UIKit
import Capacitor

/// Custom UITextField that opens on the emoji keyboard but still allows
/// switching to other input modes (e.g. the emoji keyboard's own search field,
/// which needs the alphabetic keyboard).
class EmojiTextField: UITextField {
    /// While true, the field reports the emoji input mode so the keyboard opens
    /// on the emoji picker. Cleared after the first presentation so UIKit can
    /// freely switch modes (the in-keyboard search field requires this).
    var forceEmojiOnNextPresentation = true

    override var textInputMode: UITextInputMode? {
        if forceEmojiOnNextPresentation {
            for mode in UITextInputMode.activeInputModes {
                if mode.primaryLanguage == "emoji" {
                    return mode
                }
            }
        }
        return super.textInputMode
    }

    override var textInputContextIdentifier: String? {
        return forceEmojiOnNextPresentation ? "emoji" : super.textInputContextIdentifier
    }
}

@objc(EmojiKeyboardPlugin)
public class EmojiKeyboardPlugin: CAPPlugin, CAPBridgedPlugin, UITextFieldDelegate {
    public let identifier = "EmojiKeyboardPlugin"
    public let jsName = "EmojiKeyboardPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "showEmojiKeyboard", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hideEmojiKeyboard", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getEmojiText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setEmojiText", returnType: CAPPluginReturnPromise)
    ]
    
    private var emojiTextField: EmojiTextField?
    private var currentText: String = ""
    
    override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(inputModeDidChange),
            name: UITextInputMode.currentInputModeDidChangeNotification,
            object: nil
        )
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc func inputModeDidChange() {
        // Once the keyboard is up, the user (or the emoji keyboard's search
        // field) may switch to a text keyboard. Stop forcing emoji so that
        // switch is allowed; do NOT reloadInputViews here or we'd yank the
        // emoji picker back over the search keyboard.
        emojiTextField?.forceEmojiOnNextPresentation = false
    }
    
    @objc func showEmojiKeyboard(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.reject("Plugin instance not available")
                return
            }
            
            if self.emojiTextField == nil {
                let textField = EmojiTextField()
                textField.isHidden = true
                textField.autocorrectionType = .no
                textField.autocapitalizationType = .none
                textField.spellCheckingType = .no
                textField.delegate = self
                textField.frame = CGRect(x: -1000, y: -1000, width: 1, height: 1)
                
                var window: UIWindow?
                if #available(iOS 15.0, *) {
                    window = UIApplication.shared.connectedScenes
                        .compactMap { $0 as? UIWindowScene }
                        .flatMap { $0.windows }
                        .first(where: { $0.isKeyWindow })
                } else {
                    window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) ?? UIApplication.shared.windows.first
                }
                
                guard let targetWindow = window else {
                    call.reject("No window available")
                    return
                }
                
                targetWindow.addSubview(textField)
                
                NotificationCenter.default.addObserver(
                    self,
                    selector: #selector(self.textDidChange),
                    name: UITextField.textDidChangeNotification,
                    object: textField
                )
                
                self.emojiTextField = textField
            }
            
            guard let textField = self.emojiTextField else {
                call.reject("Failed to create text field")
                return
            }
            
            if let initialText = call.getString("initialText") {
                textField.text = initialText
                self.currentText = initialText
            }
            
            // Always (re)open on the emoji picker; mode is unlocked again as
            // soon as iOS reports an input-mode change (e.g. search tapped).
            textField.forceEmojiOnNextPresentation = true
            textField.becomeFirstResponder()
            textField.reloadInputViews()
            
            call.resolve([
                "success": true,
                "text": self.currentText
            ])
        }
    }
    
    @objc func hideEmojiKeyboard(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.emojiTextField?.resignFirstResponder()
            call.resolve(["success": true])
        }
    }
    
    @objc func getEmojiText(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            call.resolve(["text": self?.currentText ?? ""])
        }
    }
    
    @objc func setEmojiText(_ call: CAPPluginCall) {
        guard let text = call.getString("text") else {
            call.reject("Missing text parameter")
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            self?.currentText = text
            self?.emojiTextField?.text = text
            call.resolve(["success": true, "text": text])
        }
    }
    
    // Reject any insertion that isn't an emoji at the source, so a letter
    // typed via the 🌐 globe key never even appears in the slot. Deletions
    // (empty replacement) are always allowed.
    public func textField(_ textField: UITextField,
                          shouldChangeCharactersIn range: NSRange,
                          replacementString string: String) -> Bool {
        if string.isEmpty { return true }

        return EmojiParser.isIncompleteFlag(string) || EmojiParser.containsOnlyEmoji(string)
    }

    @objc func textDidChange(_ notification: Notification) {
        guard let textField = notification.object as? UITextField,
              textField == emojiTextField else {
            return
        }
        
        let newText = textField.text ?? ""

        // UIKit can deliver a flag as two separate regional-indicator changes.
        // Keep the first half in the field and wait for the completed flag.
        if EmojiParser.isIncompleteFlag(newText) { return }
        
        let filteredText = EmojiParser.firstEmoji(in: newText) ?? ""
        
        if filteredText != newText {
            textField.text = filteredText
        }
        
        currentText = filteredText
        
        notifyListeners("emojiTextChanged", data: ["text": filteredText])
    }
}
