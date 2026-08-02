sub init()
  m.surface = m.top.findNode("surface")
  m.label = m.top.findNode("label")
  m.underline = m.top.findNode("underline")
end sub

sub showContent()
  if m.top.itemContent = invalid return
  m.label.text = m.top.itemContent.title
end sub

sub showFocus()
  amount = m.top.focusPercent
  m.surface.color = "0xF4EFE5FF"
  m.surface.opacity = amount
  m.label.color = "0xAFC1CBFF"
  if amount > 0.5 then m.label.color = "0x102E3EFF"
  m.underline.opacity = amount
  m.top.scaleRotateCenter = [119, 28]
  m.top.scale = [1.0 + (amount * 0.035), 1.0 + (amount * 0.035)]
end sub
