sub init()
  m.background = m.top.findNode("background")
  m.brand = m.top.findNode("brand")
  m.tagline = m.top.findNode("tagline")
  m.accountLabel = m.top.findNode("accountLabel")
  m.rule = m.top.findNode("rule")
  m.heroImage = m.top.findNode("heroImage")
  m.heroCategory = m.top.findNode("heroCategory")
  m.heroHeadline = m.top.findNode("heroHeadline")
  m.heroDek = m.top.findNode("heroDek")
  m.heroMeta = m.top.findNode("heroMeta")
  m.latestLabel = m.top.findNode("latestLabel")
  m.storyList = m.top.findNode("storyList")
  m.statusLabel = m.top.findNode("statusLabel")
  m.detailOverlay = m.top.findNode("detailOverlay")
  m.weatherOverlay = m.top.findNode("weatherOverlay")
  m.pairOverlay = m.top.findNode("pairOverlay")
  m.video = m.top.findNode("video")
  m.pairTimer = m.top.findNode("pairTimer")
  m.homeButton = m.top.findNode("homeButton")
  m.liveButton = m.top.findNode("liveButton")
  m.weatherButton = m.top.findNode("weatherButton")
  m.connectButton = m.top.findNode("connectButton")
  m.themeButton = m.top.findNode("themeButton")
  m.pairRetry = m.top.findNode("pairRetry")
  m.pairClose = m.top.findNode("pairClose")

  m.homeButton.observeField("buttonSelected", "onHomeSelected")
  m.liveButton.observeField("buttonSelected", "onLiveSelected")
  m.weatherButton.observeField("buttonSelected", "onWeatherSelected")
  m.connectButton.observeField("buttonSelected", "onConnectSelected")
  m.themeButton.observeField("buttonSelected", "onThemeSelected")
  m.pairRetry.observeField("buttonSelected", "onPairRetry")
  m.pairClose.observeField("buttonSelected", "onPairClose")
  m.storyList.observeField("rowItemFocused", "onStoryFocused")
  m.storyList.observeField("rowItemSelected", "onStorySelected")
  m.pairTimer.observeField("fire", "onPairTimer")

  appInfo = CreateObject("roAppInfo")
  m.apiBase = appInfo.GetValue("api_url")
  if Right(m.apiBase, 1) = "/" then m.apiBase = Left(m.apiBase, Len(m.apiBase) - 1)
  m.appVersion = appInfo.GetValue("major_version") + "." + appInfo.GetValue("minor_version") + "." + appInfo.GetValue("build_version")
  deviceInfo = CreateObject("roDeviceInfo")
  m.installationId = "roku_" + deviceInfo.GetChannelClientId()
  m.live = invalid
  m.weather = invalid
  m.pairSession = invalid
  m.pairPollInFlight = false

  registry = CreateObject("roRegistrySection", "Harborline")
  m.themePreference = "system"
  if registry.Exists("theme") then m.themePreference = registry.Read("theme")
  m.accessToken = ""
  if registry.Exists("deviceToken") then m.accessToken = registry.Read("deviceToken")
  applyTheme()

  if m.apiBase = "" or m.apiBase = "unconfigured" or Instr(1, m.apiBase, ".example") > 0 or Instr(1, m.apiBase, "your-project.vercel.app") > 0
    m.statusLabel.text = "Setup required: package this app with the public Courier API URL."
    m.heroHeadline.text = "Connect this Roku build to the Courier"
    m.heroDek.text = "See apps/roku/README.md for the one-command production packaging workflow."
  else
    loadContent()
  end if
  m.homeButton.setFocus(true)
end sub

sub loadContent()
  m.statusLabel.text = "Refreshing local coverage…"
  task = createApiTask("bootstrap", "onBootstrap")
  task.control = "RUN"
end sub

function createApiTask(operation as String, callback as String) as Object
  task = CreateObject("roSGNode", "ApiTask")
  task.operation = operation
  task.apiBase = m.apiBase
  task.appVersion = m.appVersion
  task.installationId = m.installationId
  task.accessToken = m.accessToken
  task.observeField("response", callback)
  m.top.appendChild(task)
  return task
end function

sub onBootstrap(event as Object)
  result = event.GetData()
  removeTask(event)
  if result = invalid or not result.ok
    message = "The Courier is temporarily unavailable. Select Latest to try again."
    if result <> invalid and result.DoesExist("message") then message = result.message
    m.statusLabel.text = message
    return
  end if

  m.live = result.live
  m.weather = result.weather
  showStories(result.stories)
  m.statusLabel.text = "The Courier is current · Select a story for more"
  reportPresence()
  if m.accessToken <> "" then validateSession()
end sub

sub showStories(stories as Dynamic)
  if stories = invalid or type(stories) <> "roArray" or stories.Count() = 0
    m.heroHeadline.text = "No published stories yet"
    m.heroDek.text = "Editors can publish the first story from Courier Studio."
    return
  end if

  root = CreateObject("roSGNode", "ContentNode")
  row = root.CreateChild("ContentNode")
  row.title = "Latest"
  for each story in stories
    item = row.CreateChild("ContentNode")
    item.id = safeString(story.slug)
    item.title = safeString(story.headline)
    item.description = safeString(story.dek)
    item.shortDescriptionLine1 = safeString(story.categoryLabel)
    item.shortDescriptionLine2 = safeString(story.location)
    item.HDPosterUrl = safeString(story.image)
    item.releaseDate = safeString(story.publishedAt)
    item.AddField("storyBody", "string", false)
    item.storyBody = firstBody(story)
    item.AddField("readingMinutes", "integer", false)
    if story.readingMinutes <> invalid then item.readingMinutes = story.readingMinutes
  end for
  m.storyList.content = root
  m.storyList.jumpToRowItem = [0, 0]
  updateHero(row.GetChild(0))
end sub

sub onStoryFocused(event as Object)
  position = event.GetData()
  item = storyAt(position)
  if item <> invalid then updateHero(item)
end sub

sub onStorySelected(event as Object)
  item = storyAt(event.GetData())
  if item = invalid return
  m.top.findNode("detailHeadline").text = item.title
  m.top.findNode("detailDek").text = item.description
  m.top.findNode("detailBody").text = item.storyBody
  m.detailOverlay.visible = true
end sub

function storyAt(position as Dynamic) as Dynamic
  if position = invalid or m.storyList.content = invalid return invalid
  row = m.storyList.content.GetChild(position[0])
  if row = invalid return invalid
  return row.GetChild(position[1])
end function

sub updateHero(item as Object)
  m.heroImage.uri = item.HDPosterUrl
  m.heroCategory.text = UCase(item.shortDescriptionLine1)
  m.heroHeadline.text = item.title
  m.heroDek.text = item.description
  minutes = item.readingMinutes
  if minutes < 1 then minutes = 1
  m.heroMeta.text = item.shortDescriptionLine2 + " · " + minutes.ToStr() + " MIN READ"
end sub

sub onHomeSelected()
  closeOverlays()
  loadContent()
end sub

sub onLiveSelected()
  if m.live = invalid or not m.live.isLive or m.live.streamUrl = invalid or m.live.streamUrl = ""
    m.statusLabel.text = "The Courier is not live right now. Check the schedule on the website."
    return
  end if
  content = CreateObject("roSGNode", "ContentNode")
  content.title = safeString(m.live.title)
  content.url = m.live.streamUrl
  content.streamFormat = "hls"
  m.video.content = content
  m.video.visible = true
  m.video.control = "play"
  m.video.setFocus(true)
end sub

sub onWeatherSelected()
  if m.weather = invalid
    m.statusLabel.text = "Weather is not available right now."
    return
  end if
  m.top.findNode("weatherLocation").text = safeString(m.weather.location)
  m.top.findNode("weatherTemperature").text = m.weather.temperature.ToStr() + "°"
  m.top.findNode("weatherCondition").text = safeString(m.weather.condition)
  details = "Feels like " + m.weather.feelsLike.ToStr() + "°  ·  High " + m.weather.high.ToStr() + "°  ·  Low " + m.weather.low.ToStr() + "°"
  details = details + Chr(10) + "Wind " + safeString(m.weather.wind) + "  ·  Humidity " + m.weather.humidity.ToStr() + "%"
  m.top.findNode("weatherDetails").text = details
  alert = ""
  if m.weather.alert <> invalid then alert = m.weather.alert
  m.top.findNode("weatherAlert").text = alert
  m.weatherOverlay.visible = true
end sub

sub onConnectSelected()
  m.pairOverlay.visible = true
  m.top.findNode("pairCode").text = ""
  m.top.findNode("pairUri").text = ""
  m.top.findNode("pairQr").uri = ""
  m.top.findNode("pairStatus").text = "Creating a secure request…"
  m.pairRetry.visible = false
  m.pairClose.setFocus(true)
  beginPairing()
end sub

sub beginPairing()
  m.pairTimer.control = "stop"
  m.pairSession = invalid
  m.pairPollInFlight = false
  task = createApiTask("pairStart", "onPairStart")
  task.control = "RUN"
end sub

sub onPairStart(event as Object)
  result = event.GetData()
  removeTask(event)
  if result = invalid or not result.ok
    message = "Account linking could not start."
    if result <> invalid and result.DoesExist("message") then message = result.message
    m.top.findNode("pairStatus").text = message
    m.pairRetry.visible = true
    m.pairRetry.setFocus(true)
    return
  end if
  m.pairSession = result
  m.top.findNode("pairCode").text = result.userCode
  m.top.findNode("pairUri").text = result.verificationUri
  m.top.findNode("pairQr").uri = result.qrImageUrl
  m.top.findNode("pairStatus").text = "Waiting for approval. Make sure both screens show " + result.userCode + "."
  m.pairRetry.visible = false
  if result.pollIntervalSeconds <> invalid then m.pairTimer.duration = result.pollIntervalSeconds
  m.pairTimer.control = "start"
end sub

sub onPairTimer()
  if m.pairSession = invalid or m.pairPollInFlight return
  m.pairPollInFlight = true
  task = createApiTask("pairPoll", "onPairPoll")
  task.sessionId = m.pairSession.id
  task.deviceSecret = m.pairSession.deviceSecret
  task.control = "RUN"
end sub

sub onPairPoll(event as Object)
  result = event.GetData()
  removeTask(event)
  m.pairPollInFlight = false
  if result = invalid or not result.ok
    if result <> invalid and result.DoesExist("message") then m.top.findNode("pairStatus").text = result.message
    return
  end if
  if result.status = "approved" and result.accessToken <> invalid
    m.pairTimer.control = "stop"
    m.accessToken = result.accessToken
    registry = CreateObject("roRegistrySection", "Harborline")
    registry.Write("deviceToken", m.accessToken)
    registry.Flush()
    name = "Courier reader"
    if result.account <> invalid and result.account.name <> invalid then name = result.account.name
    m.accountLabel.text = "Connected as " + name
    m.top.findNode("pairStatus").text = "Connected as " + name + ". You may close this screen."
    m.pairSession = invalid
    reportPresence()
  else if result.status <> "pending"
    m.pairTimer.control = "stop"
    m.top.findNode("pairStatus").text = "This request is no longer active. Select Try again for a new code."
    m.pairRetry.visible = true
    m.pairRetry.setFocus(true)
  end if
end sub

sub onPairRetry()
  m.top.findNode("pairStatus").text = "Creating a new secure request…"
  m.pairRetry.visible = false
  beginPairing()
end sub

sub onPairClose()
  m.pairTimer.control = "stop"
  m.pairOverlay.visible = false
  m.connectButton.setFocus(true)
end sub

sub validateSession()
  task = createApiTask("session", "onSession")
  task.control = "RUN"
end sub

sub onSession(event as Object)
  result = event.GetData()
  removeTask(event)
  if result <> invalid and result.ok
    m.accountLabel.text = "Connected as " + safeString(result.name)
  else
    m.accessToken = ""
    registry = CreateObject("roRegistrySection", "Harborline")
    registry.Delete("deviceToken")
    registry.Flush()
    m.accountLabel.text = "Public access"
  end if
end sub

sub reportPresence()
  task = createApiTask("presence", "onPresence")
  task.control = "RUN"
end sub

sub onPresence(event as Object)
  removeTask(event)
end sub

sub onThemeSelected()
  if m.themePreference = "system"
    m.themePreference = "light"
  else if m.themePreference = "light"
    m.themePreference = "dark"
  else
    m.themePreference = "system"
  end if
  registry = CreateObject("roRegistrySection", "Harborline")
  registry.Write("theme", m.themePreference)
  registry.Flush()
  applyTheme()
end sub

sub applyTheme()
  preference = m.themePreference
  resolved = preference
  if resolved = "system" then resolved = "dark"
  m.themeButton.text = "Theme: " + titleCase(preference)

  if resolved = "light"
    m.background.color = "0xF3F0E9FF"
    m.brand.color = "0x08263AFF"
    m.tagline.color = "0x526B78FF"
    m.accountLabel.color = "0x526B78FF"
    m.rule.color = "0x9AAAB2FF"
    m.heroCategory.color = "0xA56600FF"
    m.heroHeadline.color = "0x08263AFF"
    m.heroDek.color = "0x344E5CFF"
    m.heroMeta.color = "0x526B78FF"
    m.latestLabel.color = "0x08263AFF"
    m.statusLabel.color = "0x526B78FF"
  else
    m.background.color = "0x061B29FF"
    m.brand.color = "0xFFFFFFFF"
    m.tagline.color = "0x87A9BCFF"
    m.accountLabel.color = "0x87A9BCFF"
    m.rule.color = "0x295066FF"
    m.heroCategory.color = "0xF5B335FF"
    m.heroHeadline.color = "0xFFFFFFFF"
    m.heroDek.color = "0xC5D5DEFF"
    m.heroMeta.color = "0x87A9BCFF"
    m.latestLabel.color = "0xFFFFFFFF"
    m.statusLabel.color = "0x87A9BCFF"
  end if
end sub

sub closeOverlays()
  m.detailOverlay.visible = false
  m.weatherOverlay.visible = false
  m.pairOverlay.visible = false
  m.video.control = "stop"
  m.video.visible = false
end sub

sub removeTask(event as Object)
  task = event.GetRoSGNode()
  if task <> invalid then m.top.removeChild(task)
end sub

function safeString(value as Dynamic) as String
  if value = invalid return ""
  return value.ToStr()
end function

function firstBody(story as Object) as String
  if story.body <> invalid and type(story.body) = "roArray" and story.body.Count() > 0
    return safeString(story.body[0])
  end if
  return safeString(story.dek)
end function

function titleCase(value as String) as String
  if value = "" return value
  return UCase(Left(value, 1)) + Mid(value, 2)
end function

function onKeyEvent(key as String, press as Boolean) as Boolean
  if not press return false
  if key = "back"
    if m.video.visible
      m.video.control = "stop"
      m.video.visible = false
      m.liveButton.setFocus(true)
      return true
    else if m.pairOverlay.visible
      onPairClose()
      return true
    else if m.weatherOverlay.visible
      m.weatherOverlay.visible = false
      m.weatherButton.setFocus(true)
      return true
    else if m.detailOverlay.visible
      m.detailOverlay.visible = false
      m.storyList.setFocus(true)
      return true
    end if
  end if
  return false
end function
