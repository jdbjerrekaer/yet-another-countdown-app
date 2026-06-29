import SwiftUI

/// The shape of the colored emoji container, mirroring the per-event
/// `emojiShape` string synced from the web app. Any missing or unknown
/// value falls back to `.squircle` so existing widgets are unchanged.
enum EmojiShape: String {
    case squircle
    case circle
    case heart
    case flower
    case hexagon

    /// Decode from the synced string, defaulting to `.squircle`.
    init(rawValueOrDefault raw: String?) {
        self = EmojiShape(rawValue: raw ?? "") ?? .squircle
    }
}

/// A single rect-relative `Shape` that draws the chosen emoji container.
/// All geometry is derived from `rect`, so it scales to any container size.
struct EmojiContainerShape: Shape {
    let shape: EmojiShape

    func path(in rect: CGRect) -> Path {
        switch shape {
        case .squircle: return Self.squirclePath(in: rect)
        case .circle:   return Path(ellipseIn: rect)
        case .heart:    return Self.heartPath(in: rect)
        case .flower:   return Self.flowerPath(in: rect)
        case .hexagon:  return Self.roundedPath(Self.polyVerts(sides: 6, r: 48, rot: -.pi / 2), t: 0.32, in: rect)
        }
    }

    // Regular-polygon / star vertices around center (50,50) in a 0..100 space.
    private static func polyVerts(sides: Int, r: CGFloat, rot: CGFloat) -> [CGPoint] {
        (0..<sides).map { i in
            let a = rot + CGFloat(i) * 2 * .pi / CGFloat(sides)
            return CGPoint(x: 50 + r * cos(a), y: 50 + r * sin(a))
        }
    }
    // Connect verts with corners rounded by quadratic curves (t = fraction of each edge).
    private static func roundedPath(_ verts: [CGPoint], t: CGFloat, in rect: CGRect) -> Path {
        func pt(_ p: CGPoint) -> CGPoint {
            CGPoint(x: rect.minX + p.x / 100 * rect.width, y: rect.minY + p.y / 100 * rect.height)
        }
        func lerp(_ a: CGPoint, _ b: CGPoint, _ t: CGFloat) -> CGPoint {
            CGPoint(x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t)
        }
        var p = Path()
        let n = verts.count
        for i in 0..<n {
            let prev = verts[(i - 1 + n) % n], cur = verts[i], next = verts[(i + 1) % n]
            let entry = lerp(cur, prev, t), exit = lerp(cur, next, t)
            if i == 0 { p.move(to: pt(entry)) } else { p.addLine(to: pt(entry)) }
            p.addQuadCurve(to: pt(exit), control: pt(cur))
        }
        p.closeSubpath()
        return p
    }

    // Rounded square — ~28% of the side, continuous-style corners (the default).
    private static func squirclePath(in rect: CGRect) -> Path {
        let radius = min(rect.width, rect.height) * 0.28
        return Path(roundedRect: rect, cornerRadius: radius, style: .continuous)
    }

    // Classic filled heart — wide lower half stays fat before the bottom tip,
    // matching the icons8 style with room for the emoji in the center.
    // 0..100 viewBox, rect-relative.
    private static func heartPath(in rect: CGRect) -> Path {
        let w = rect.width, h = rect.height
        let x = rect.minX, y = rect.minY
        func pt(_ px: CGFloat, _ py: CGFloat) -> CGPoint {
            CGPoint(x: x + px / 100 * w, y: y + py / 100 * h)
        }

        // Exact port of the web HEART_SVG path so the widget matches the app.
        var p = Path()
        p.move(to: pt(50, 94))
        p.addCurve(to: pt(6, 37),  control1: pt(28, 78), control2: pt(6, 61))
        p.addCurve(to: pt(32, 8),  control1: pt(6, 19),  control2: pt(20, 8))
        p.addCurve(to: pt(50, 24), control1: pt(41, 8),  control2: pt(47, 15))
        p.addCurve(to: pt(68, 8),  control1: pt(53, 15), control2: pt(59, 8))
        p.addCurve(to: pt(94, 37), control1: pt(80, 8),  control2: pt(94, 19))
        p.addCurve(to: pt(50, 94), control1: pt(94, 61), control2: pt(72, 78))
        p.closeSubpath()
        return p
    }

    // Six petals (circles) around a center circle, ported from the web mask
    // (0..100 viewBox): petals (50,25) (71,37) (71,63) (50,75) (29,63) (29,37)
    // each r22, center (50,50) r28. Rect-relative; slightly narrower than tall.
    private static func flowerPath(in rect: CGRect) -> Path {
        let w = rect.width, h = rect.height
        let x = rect.minX, y = rect.minY

        func circle(cx: CGFloat, cy: CGFloat, r: CGFloat) -> CGRect {
            CGRect(x: x + (cx - r) / 100 * w, y: y + (cy - r) / 100 * h,
                   width: r * 2 / 100 * w, height: r * 2 / 100 * h)
        }

        var p = Path()
        // Six surrounding petals.
        let petals: [(CGFloat, CGFloat)] = [
            (50, 25), (71, 37), (71, 63), (50, 75), (29, 63), (29, 37)
        ]
        for (cx, cy) in petals {
            p.addEllipse(in: circle(cx: cx, cy: cy, r: 22))
        }
        // Center circle.
        p.addEllipse(in: circle(cx: 50, cy: 50, r: 28))
        return p
    }
}

extension View {
    /// Clips the colored emoji container to the chosen shape. The emoji glyph
    /// itself is drawn separately (on top) and stays unclipped.
    func emojiContainerClip(_ shape: EmojiShape) -> some View {
        clipShape(EmojiContainerShape(shape: shape))
    }
}
