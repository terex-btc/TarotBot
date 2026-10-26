// Збирає маркетинговий скриншот для App Store (6.9": 1320×2868):
// фірмовий фон + заголовок + справжній кадр із симулятора в «рамці телефона».
// Запуск: swift compose.swift <screenshot.png> <out.png> "<Headline>" "<Subline>"
import AppKit

let args = CommandLine.arguments
guard args.count >= 5 else { print("usage: compose <in> <out> <headline> <subline>"); exit(1) }
let (inPath, outPath, headline, subline) = (args[1], args[2], args[3], args[4])
let W = 1320, H = 2868

guard let shot = NSImage(contentsOfFile: inPath) else { print("cannot read \(inPath)"); exit(1) }
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 4,
                           hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
rep.size = NSSize(width: W, height: H)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let ctx = NSGraphicsContext.current!.cgContext
func rgb(_ hex: UInt32, _ a: CGFloat = 1) -> NSColor {
  NSColor(srgbRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: a)
}

// Фон: глибокий фіолетовий градієнт + сяйво зверху
NSGradient(colors: [rgb(0x2a1c7a), rgb(0x150f45), rgb(0x0d0a1f)], atLocations: [0, 0.45, 1], colorSpace: .sRGB)!
  .draw(in: NSRect(x: 0, y: 0, width: W, height: H), angle: -90)
NSGradient(colors: [rgb(0x8f6bff, 0.45), rgb(0x8f6bff, 0)])!
  .draw(fromCenter: NSPoint(x: W / 2, y: H - 360), radius: 0, toCenter: NSPoint(x: W / 2, y: H - 360), radius: 900, options: [])

// Зорі (детерміновано)
var seed: UInt32 = 7
func rnd() -> CGFloat { seed = seed &* 1664525 &+ 1013904223; return CGFloat(seed % 10000) / 10000 }
for _ in 0..<140 {
  let r = rnd() * 3 + 1.2
  rgb(0xffffff, 0.25 + rnd() * 0.6).setFill()
  NSBezierPath(ovalIn: NSRect(x: rnd() * CGFloat(W), y: rnd() * CGFloat(H), width: r, height: r)).fill()
}

// Заголовок і підзаголовок
func draw(_ text: String, font: NSFont, color: NSColor, top: CGFloat, lineHeight: CGFloat) -> CGFloat {
  let p = NSMutableParagraphStyle(); p.alignment = .center; p.minimumLineHeight = lineHeight; p.maximumLineHeight = lineHeight
  let s = NSAttributedString(string: text, attributes: [.font: font, .foregroundColor: color, .paragraphStyle: p, .kern: -0.5])
  let box = s.boundingRect(with: NSSize(width: 1180, height: 1000), options: [.usesLineFragmentOrigin])
  s.draw(with: NSRect(x: 70, y: CGFloat(H) - top - box.height, width: 1180, height: box.height), options: [.usesLineFragmentOrigin])
  return box.height
}
let serif = NSFont(name: "Didot-Bold", size: 108) ?? NSFont(name: "Georgia-Bold", size: 104)!
let hH = draw(headline, font: serif, color: .white, top: 170, lineHeight: 120)
_ = draw(subline, font: .systemFont(ofSize: 50, weight: .semibold), color: rgb(0xd8ccff), top: 170 + hH + 34, lineHeight: 64)

// Телефон: кадр зі скругленими кутами, рамка й світіння
let devW: CGFloat = 1010
let devH = devW * shot.size.height / shot.size.width
let devRect = NSRect(x: (CGFloat(W) - devW) / 2, y: -110, width: devW, height: devH)
ctx.saveGState()
ctx.setShadow(offset: .zero, blur: 120, color: rgb(0x8f6bff, 0.55).cgColor)
rgb(0x0a0815).setFill()
NSBezierPath(roundedRect: devRect.insetBy(dx: -18, dy: -18), xRadius: 132, yRadius: 132).fill()
ctx.restoreGState()
rgb(0x3a2f7a).setStroke()
let bezel = NSBezierPath(roundedRect: devRect.insetBy(dx: -18, dy: -18), xRadius: 132, yRadius: 132)
bezel.lineWidth = 4; bezel.stroke()
NSGraphicsContext.saveGraphicsState()
NSBezierPath(roundedRect: devRect, xRadius: 116, yRadius: 116).addClip()
shot.draw(in: devRect)
NSGraphicsContext.restoreGraphicsState()

NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: outPath))
print("saved \(outPath)")
