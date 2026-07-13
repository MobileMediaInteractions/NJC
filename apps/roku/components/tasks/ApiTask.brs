sub init()
  m.top.functionName = "execute"
end sub

sub execute()
  operation = m.top.operation
  if operation = "bootstrap"
    loadBootstrap()
  else if operation = "presence"
    reportPresence()
  else if operation = "pairStart"
    startPairing()
  else if operation = "pairPoll"
    pollPairing()
  else if operation = "session"
    loadSession()
  else
    m.top.response = { ok: false, message: "Unknown API operation." }
  end if
end sub

sub loadBootstrap()
  stories = apiRequest("/api/v1/stories?limit=14", "GET", invalid)
  live = apiRequest("/api/v1/live", "GET", invalid)
  weather = apiRequest("/api/v1/weather", "GET", invalid)

  if not stories.ok
    m.top.response = { ok: false, message: stories.message }
    return
  end if

  result = {
    ok: true,
    stories: unwrap(stories.payload),
    live: invalid,
    weather: invalid
  }
  if live.ok then result.live = unwrap(live.payload)
  if weather.ok then result.weather = unwrap(weather.payload)
  m.top.response = result
end sub

sub reportPresence()
  body = {
    installationId: m.top.installationId,
    platform: "roku",
    source: "roku-app",
    appVersion: m.top.appVersion
  }
  result = apiRequest("/api/v1/audience/presence", "POST", body)
  if result.ok
    m.top.response = { ok: true }
  else
    m.top.response = { ok: false, message: result.message }
  end if
end sub

sub startPairing()
  result = apiRequest("/api/v1/device-pairing", "POST", {
    target: "roku",
    deviceName: "Roku"
  })
  m.top.response = normalizeResult(result)
end sub

sub pollPairing()
  path = "/api/v1/device-pairing/" + m.top.sessionId + "/poll"
  result = apiRequest(path, "POST", { deviceSecret: m.top.deviceSecret })
  m.top.response = normalizeResult(result)
end sub

sub loadSession()
  result = apiRequest("/api/v1/device-session", "GET", invalid)
  m.top.response = normalizeResult(result)
end sub

function normalizeResult(result as Object) as Object
  if not result.ok return { ok: false, message: result.message }
  payload = unwrap(result.payload)
  if payload = invalid return { ok: false, message: "The server returned an empty response." }
  payload.ok = true
  return payload
end function

function unwrap(payload as Dynamic) as Dynamic
  if payload = invalid return invalid
  if type(payload) = "roAssociativeArray" and payload.DoesExist("data") return payload.data
  return payload
end function

function apiRequest(path as String, method as String, body as Dynamic) as Object
  transfer = CreateObject("roUrlTransfer")
  transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
  transfer.InitClientCertificates()
  transfer.SetUrl(m.top.apiBase + path)
  transfer.AddHeader("Accept", "application/json")
  transfer.AddHeader("Content-Type", "application/json")
  transfer.AddHeader("User-Agent", "Harborline-Roku/" + m.top.appVersion)
  if m.top.accessToken <> "" transfer.AddHeader("Authorization", "Bearer " + m.top.accessToken)

  responseText = ""
  if method = "POST"
    responseText = transfer.PostFromString(FormatJson(body))
  else
    responseText = transfer.GetToString()
  end if
  status = transfer.GetResponseCode()

  if responseText = invalid or responseText = ""
    return { ok: false, message: "Harborline could not reach the news service." }
  end if

  payload = ParseJson(responseText)
  if status < 200 or status >= 300
    message = "The news service returned an error."
    if payload <> invalid and payload.DoesExist("error") and payload.error.DoesExist("message")
      message = payload.error.message
    end if
    return { ok: false, message: message, status: status }
  end if
  if payload = invalid return { ok: false, message: "The news service returned invalid data." }
  return { ok: true, payload: payload, status: status }
end function
