// Text of a PDF letter, for scripts/import-ministerial-directions.js (macOS only: PDFKit and Vision, no downloads).
// Usage: pdf-text in.pdf  -> prints "ocr" or "text" on the first line, then the text.
// A PDF with a text layer is read as is. A scanned letter (under 300 characters of text) is rendered at 3x and read
// with Apple's on-device text recognition (en-GB). Handwritten dates in scans are often misread, so the importer
// checks every date it takes from a letter.
import Foundation
import PDFKit
import Vision

let args = CommandLine.arguments
guard args.count == 2, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else {
  FileHandle.standardError.write("usage: pdf-text in.pdf\n".data(using: .utf8)!); exit(1)
}
var text = ""
for i in 0..<doc.pageCount { text += (doc.page(at: i)?.string ?? "") + "\n" }
if text.trimmingCharacters(in: .whitespacesAndNewlines).count >= 300 { print("text"); print(text); exit(0) }

var ocr = ""
for i in 0..<doc.pageCount {
  guard let page = doc.page(at: i) else { continue }
  let box = page.bounds(for: .mediaBox); let scale: CGFloat = 3
  let w = Int(box.width * scale), h = Int(box.height * scale)
  guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { continue }
  ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
  ctx.scaleBy(x: scale, y: scale); page.draw(with: .mediaBox, to: ctx)
  guard let img = ctx.makeImage() else { continue }
  let req = VNRecognizeTextRequest(); req.recognitionLevel = .accurate; req.recognitionLanguages = ["en-GB"]; req.usesLanguageCorrection = true
  try? VNImageRequestHandler(cgImage: img, options: [:]).perform([req])
  for o in req.results ?? [] { if let t = o.topCandidates(1).first { ocr += t.string + "\n" } }
}
print("ocr"); print(ocr)
