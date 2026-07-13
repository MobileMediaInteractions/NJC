sub Main()
  screen = CreateObject("roSGScreen")
  port = CreateObject("roMessagePort")
  screen.SetMessagePort(port)

  scene = screen.CreateScene("MainScene")
  screen.Show()

  while true
    message = Wait(0, port)
    if type(message) = "roSGScreenEvent" and message.IsScreenClosed() then return
  end while
end sub
