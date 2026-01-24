import Foundation
import UIKit
import Capacitor

/// Custom UITextField that forces emoji keyboard
class EmojiTextField: UITextField {
    override var textInputMode: UITextInputMode? {
        for mode in UITextInputMode.activeInputModes {
            if mode.primaryLanguage == "emoji" {
                return mode
            }
        }
        return super.textInputMode
    }
    
    override var textInputContextIdentifier: String? {
        return "emoji"
    }
}

@objc(EmojiKeyboardPlugin)
public class EmojiKeyboardPlugin: CAPPlugin, CAPBridgedPlugin {
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
        DispatchQueue.main.async { [weak self] in
            self?.emojiTextField?.reloadInputViews()
        }
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
    
    @objc func textDidChange(_ notification: Notification) {
        guard let textField = notification.object as? UITextField,
              textField == emojiTextField else {
            return
        }
        
        let newText = textField.text ?? ""
        
        let emojiRegex = try? NSRegularExpression(pattern: "\\p{Emoji}|\\p{Extended_Pictographic}", options: [])
        let nsString = newText as NSString
        let matches = emojiRegex?.matches(in: newText, options: [], range: NSRange(location: 0, length: nsString.length))
        
        var filteredText = ""
        if let matches = matches, !matches.isEmpty {
            let firstMatch = matches[0]
            filteredText = nsString.substring(with: firstMatch.range)
        }
        
        if filteredText != newText {
            textField.text = filteredText
        }
        
        currentText = filteredText
        
        notifyListeners("emojiTextChanged", data: ["text": filteredText])
    }
}
