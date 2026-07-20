sub init()
  m.focus = m.top.findNode("focus")
  m.image = m.top.findNode("image")
  m.category = m.top.findNode("category")
  m.headline = m.top.findNode("headline")
  m.top.scaleRotateCenter = [212, 112]
  if m.top.itemContent <> invalid then showContent()
end sub

sub showContent()
  content = m.top.itemContent
  if content = invalid return
  m.image.uri = content.HDPosterUrl
  m.category.text = UCase(content.shortDescriptionLine1)
  m.headline.text = content.title
end sub

sub showFocus()
  m.focus.opacity = m.top.focusPercent
  scale = 1.0 + (m.top.focusPercent * 0.025)
  m.top.scale = [scale, scale]
end sub
