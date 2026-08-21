sub init()
  m.background = m.top.findNode("background")
  m.brand = m.top.findNode("brand")
  m.tagline = m.top.findNode("tagline")
  m.releaseFlair = m.top.findNode("releaseFlair")
  m.releaseFlairLabel = m.top.findNode("releaseFlairLabel")
  m.accountLabel = m.top.findNode("accountLabel")
  m.rule = m.top.findNode("rule")
  m.navList = m.top.findNode("navList")
  m.homeCanvas = m.top.findNode("homeCanvas")
  m.heroImage = m.top.findNode("heroImage")
  m.heroCategory = m.top.findNode("heroCategory")
  m.heroHeadline = m.top.findNode("heroHeadline")
  m.heroDek = m.top.findNode("heroDek")
  m.heroMeta = m.top.findNode("heroMeta")
  m.latestLabel = m.top.findNode("latestLabel")
  m.storyList = m.top.findNode("storyList")
  m.statusLabel = m.top.findNode("statusLabel")
  m.loadingOverlay = m.top.findNode("loadingOverlay")
  m.loadingLabel = m.top.findNode("loadingLabel")
  m.detailOverlay = m.top.findNode("detailOverlay")
  m.detailBody = m.top.findNode("detailBody")
  m.detailWhy = m.top.findNode("detailWhy")
  m.detailScrollThumb = m.top.findNode("detailScrollThumb")
  m.weatherOverlay = m.top.findNode("weatherOverlay")
  m.pairOverlay = m.top.findNode("pairOverlay")
  m.pairQr = m.top.findNode("pairQr")
  m.pairSpinner = m.top.findNode("pairSpinner")
  m.pairProcessingShade = m.top.findNode("pairProcessingShade")
  m.pairCountdown = m.top.findNode("pairCountdown")
  m.pairSuccess = m.top.findNode("pairSuccess")
  m.video = m.top.findNode("video")
  m.pairTimer = m.top.findNode("pairTimer")
  m.pairCountdownTimer = m.top.findNode("pairCountdownTimer")
  m.pairSuccessTimer = m.top.findNode("pairSuccessTimer")
  m.contentRefreshTimer = m.top.findNode("contentRefreshTimer")
  m.pairRetry = m.top.findNode("pairRetry")
  m.pairClose = m.top.findNode("pairClose")

  m.navList.observeField("rowItemSelected", "onNavigationSelected")
  m.storyList.observeField("rowItemFocused", "onStoryFocused")
  m.storyList.observeField("rowItemSelected", "onStorySelected")
  m.pairRetry.observeField("buttonSelected", "onPairRetry")
  m.pairClose.observeField("buttonSelected", "onPairClose")
  m.pairTimer.observeField("fire", "onPairTimer")
  m.pairCountdownTimer.observeField("fire", "onPairCountdown")
  m.pairSuccessTimer.observeField("fire", "onPairSuccess")
  m.contentRefreshTimer.observeField("fire", "onContentRefresh")

  appInfo = CreateObject("roAppInfo")
  m.apiBase = appInfo.GetValue("api_url")
  if Right(m.apiBase, 1) = "/" then m.apiBase = Left(m.apiBase, Len(m.apiBase) - 1)
  m.appVersion = appInfo.GetValue("major_version") + "." + appInfo.GetValue("minor_version") + "." + appInfo.GetValue("build_version")
  m.buildNumber = appInfo.GetValue("build_version")
  deviceInfo = CreateObject("roDeviceInfo")
  m.osVersion = deviceInfo.GetVersion()
  m.installationId = "roku_" + deviceInfo.GetChannelClientId()
  m.live = invalid
  m.weather = invalid
  m.configuration = invalid
  m.activeCategory = ""
  m.pairSession = invalid
  m.pairPhase = "waiting"
  m.pairSeconds = 60
  m.pairPollInFlight = false
  m.bootstrapInFlight = false
  m.detailPages = []
  m.detailPageIndex = 0
  m.lastStoryPosition = [0, 0]

  registry = CreateObject("roRegistrySection", "Harborline")
  m.systemTheme = "dark"
  m.themePreference = "system"
  if registry.Exists("theme") then m.themePreference = registry.Read("theme")
  if m.themePreference = m.systemTheme
    m.themePreference = "system"
    registry.Write("theme", m.themePreference)
    registry.Flush()
  end if
  m.accessToken = ""
  m.releaseChannel = "production"
  if registry.Exists("deviceToken") then m.accessToken = registry.Read("deviceToken")
  if registry.Exists("rokuConfig")
    cachedConfig = ParseJson(registry.Read("rokuConfig"))
    if validConfiguration(cachedConfig) then applyConfiguration(cachedConfig)
  end if
  applyReleaseChannel("production")
  buildNavigation()
  applyTheme()

  if m.apiBase = "" or m.apiBase = "unconfigured" or Instr(1, m.apiBase, ".example") > 0 or Instr(1, m.apiBase, "your-project.vercel.app") > 0
    showContentError("This Roku build is not connected", "Package the channel with the public Courier API URL.")
  else
    loadContent()
  end if
  m.navList.setFocus(true)
end sub

function createApiTask(operation as String, callback as String) as Object
  task = CreateObject("roSGNode", "ApiTask")
  task.operation = operation
  task.apiBase = m.apiBase
  task.appVersion = m.appVersion
  task.buildNumber = m.buildNumber
  task.releaseChannel = m.releaseChannel
  task.osVersion = m.osVersion
  task.installationId = m.installationId
  task.accessToken = m.accessToken
  task.category = m.activeCategory
  task.observeField("response", callback)
  m.top.appendChild(task)
  return task
end function

sub loadContent()
  if m.bootstrapInFlight return
  m.bootstrapInFlight = true
  m.loadingOverlay.visible = true
  m.loadingLabel.text = "Refreshing local coverage…"
  m.statusLabel.text = "Refreshing local coverage…"
  task = createApiTask("bootstrap", "onBootstrap")
  task.control = "RUN"
end sub

sub onBootstrap(event as Object)
  result = event.GetData()
  removeTask(event)
  m.bootstrapInFlight = false
  m.loadingOverlay.visible = false
  if result = invalid or not result.ok
    message = "The Courier is temporarily unavailable. Select a section to retry."
    if result <> invalid and result.DoesExist("message") then message = result.message
    if not hasStoryItems() then showContentError("Local coverage is offline", "Check the connection, then select Latest to try again.")
    m.statusLabel.text = message
    return
  end if
  if validConfiguration(result.config)
    applyConfiguration(result.config)
    registry = CreateObject("roRegistrySection", "Harborline")
    registry.Write("rokuConfig", FormatJson(result.config))
    registry.Flush()
  end if
  showStories(result.stories)
  m.statusLabel.text = "The Courier is current · Select a story for the full report"
  loadSecondaryContent()
  reportPresence()
  if m.accessToken <> "" then validateSession()
  m.contentRefreshTimer.control = "start"
end sub

sub onContentRefresh()
  if not m.detailOverlay.visible and not m.pairOverlay.visible and not m.video.visible then loadContent()
end sub

sub showContentError(headline as String, detail as String)
  m.heroImage.uri = ""
  m.heroCategory.text = "NJ COURIER"
  m.heroHeadline.text = headline
  m.heroDek.text = detail
  m.heroMeta.text = "Press Select on Latest to retry"
end sub

function validConfiguration(value as Dynamic) as Boolean
  if value = invalid or type(value) <> "roAssociativeArray" return false
  if value.schemaVersion = invalid or value.schemaVersion <> 1 return false
  if value.navigation = invalid or type(value.navigation) <> "roArray" return false
  if value.features = invalid or type(value.features) <> "roAssociativeArray" return false
  return true
end function

sub applyConfiguration(config as Object)
  m.configuration = config
  if config.name <> invalid and config.name <> "" then m.brand.text = UCase(config.name)
  if config.tagline <> invalid and config.tagline <> "" then m.tagline.text = UCase(config.tagline)
  buildNavigation()
end sub

sub buildNavigation()
  root = CreateObject("roSGNode", "ContentNode")
  row = root.CreateChild("ContentNode")
  if m.configuration <> invalid
    for each entry in m.configuration.navigation
      href = safeString(entry.href)
      if href = "/latest"
        addNavigationItem(row, safeString(entry.label), "latest", "")
      else if Left(href, 10) = "/category/"
        addNavigationItem(row, safeString(entry.label), "category", Mid(href, 11))
      end if
    end for
  else
    addNavigationItem(row, "Latest", "latest", "")
  end if
  features = invalid
  if m.configuration <> invalid then features = m.configuration.features
  if features = invalid or features.liveVideo then addNavigationItem(row, "Watch live", "live", "")
  if features = invalid or features.weather then addNavigationItem(row, "Weather", "weather", "")
  if m.accessToken = "" then addNavigationItem(row, "Connect account", "connect", "")
  themeLabel = "Theme: " + titleCase(m.themePreference)
  if m.themePreference = "system" then themeLabel = "Theme: System · " + titleCase(m.systemTheme)
  addNavigationItem(row, themeLabel, "theme", "")
  m.navList.content = root
  m.navList.jumpToRowItem = [0, 0]
end sub

sub addNavigationItem(row as Object, label as String, destination as String, value as String)
  if label = "" return
  item = row.CreateChild("ContentNode")
  item.title = label
  item.AddField("destination", "string", false)
  item.AddField("value", "string", false)
  item.destination = destination
  item.value = value
end sub

sub onNavigationSelected(event as Object)
  item = navigationAt(event.GetData())
  if item = invalid return
  destination = item.destination
  if destination = "latest"
    m.activeCategory = ""
    m.latestLabel.text = "LATEST FROM THE NEW JERSEY COURIER"
    loadContent()
  else if destination = "category"
    m.activeCategory = item.value
    m.latestLabel.text = UCase(item.title)
    loadContent()
  else if destination = "live"
    onLiveSelected()
  else if destination = "weather"
    onWeatherSelected()
  else if destination = "connect"
    onConnectSelected()
  else if destination = "theme"
    onThemeSelected()
  end if
end sub

function navigationAt(position as Dynamic) as Dynamic
  if position = invalid or m.navList.content = invalid return invalid
  row = m.navList.content.GetChild(position[0])
  if row = invalid return invalid
  return row.GetChild(position[1])
end function

sub loadSecondaryContent()
  liveTask = createApiTask("live", "onLiveLoaded")
  liveTask.control = "RUN"
  weatherTask = createApiTask("weather", "onWeatherLoaded")
  weatherTask.control = "RUN"
end sub

sub onLiveLoaded(event as Object)
  result = event.GetData()
  removeTask(event)
  if result <> invalid and result.ok then m.live = result
end sub

sub onWeatherLoaded(event as Object)
  result = event.GetData()
  removeTask(event)
  if result <> invalid and result.ok then m.weather = result
end sub

sub showStories(stories as Dynamic)
  if stories = invalid or type(stories) <> "roArray" or stories.Count() = 0
    m.storyList.content = invalid
    m.heroImage.uri = ""
    m.heroCategory.text = "LATEST"
    m.heroHeadline.text = "No published stories in this section"
    m.heroDek.text = "Try another desk from the navigation above."
    m.heroMeta.text = ""
    m.statusLabel.text = "This feed is current and has no published stories."
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
    item.HDPosterUrl = absoluteMediaUrl(story.image)
    item.releaseDate = safeString(story.publishedAt)
    item.AddField("storyParagraphs", "stringarray", false)
    paragraphs = []
    if story.body <> invalid and type(story.body) = "roArray" then paragraphs = story.body
    if paragraphs.Count() = 0 then paragraphs = [safeString(story.dek)]
    item.storyParagraphs = paragraphs
    item.AddField("readingMinutes", "integer", false)
    if story.readingMinutes <> invalid then item.readingMinutes = story.readingMinutes
    item.AddField("authorName", "string", false)
    if story.author <> invalid then item.authorName = safeString(story.author.name)
    item.AddField("whyItMatters", "string", false)
    item.whyItMatters = safeString(story.whyItMatters)
    item.AddField("publicNoteType", "string", false)
    item.publicNoteType = safeString(story.publicNoteType)
    item.AddField("publicNote", "string", false)
    item.publicNote = safeString(story.publicNote)
  end for
  m.storyList.content = root
  m.storyList.jumpToRowItem = [0, 0]
  m.lastStoryPosition = [0, 0]
  updateHero(row.GetChild(0))
end sub

sub onStoryFocused(event as Object)
  position = event.GetData()
  item = storyAt(position)
  if item <> invalid
    m.lastStoryPosition = position
    updateHero(item)
  end if
end sub

sub onStorySelected(event as Object)
  position = event.GetData()
  item = storyAt(position)
  if item = invalid return
  m.lastStoryPosition = position
  m.top.findNode("detailCategory").text = UCase(item.shortDescriptionLine1) + " · " + UCase(item.shortDescriptionLine2)
  m.top.findNode("detailHeadline").text = item.title
  m.top.findNode("detailDek").text = item.description
  minutes = item.readingMinutes
  if minutes < 1 then minutes = 1
  m.top.findNode("detailMeta").text = "BY " + UCase(item.authorName) + " · " + minutes.ToStr() + " MIN READ"
  hasWhy = item.whyItMatters <> ""
  m.detailWhy.visible = hasWhy
  if hasWhy
    m.top.findNode("detailWhyBody").text = item.whyItMatters
    m.detailBody.translation = [148, 720]
    m.detailBody.height = 224
  else
    m.detailBody.translation = [148, 586]
    m.detailBody.height = 356
  end if
  displayParagraphs = []
  if item.publicNote <> ""
    displayParagraphs.Push(storyNoteLabel(item.publicNoteType) + Chr(10) + item.publicNote)
  end if
  for each paragraph in item.storyParagraphs
    displayParagraphs.Push(paragraph)
  end for
  m.detailPages = buildArticlePages(displayParagraphs, hasWhy)
  m.detailPageIndex = 0
  renderArticlePage()
  m.detailOverlay.visible = true
end sub

function buildArticlePages(paragraphs as Dynamic, compact as Boolean) as Object
  pages = []
  limit = 840
  if compact then limit = 500
  current = ""
  for each rawParagraph in paragraphs
    paragraph = safeString(rawParagraph)
    while Len(paragraph) > limit
      if current <> ""
        pages.Push(current)
        current = ""
      end if
      pages.Push(Left(paragraph, limit))
      paragraph = Mid(paragraph, limit + 1)
    end while
    candidate = paragraph
    if current <> "" then candidate = current + Chr(10) + Chr(10) + paragraph
    if Len(candidate) > limit and current <> ""
      pages.Push(current)
      current = paragraph
    else
      current = candidate
    end if
  end for
  if current <> "" then pages.Push(current)
  if pages.Count() = 0 then pages.Push("This story has no readable body copy yet.")
  return pages
end function

sub renderArticlePage()
  count = m.detailPages.Count()
  if count = 0 return
  if m.detailPageIndex < 0 then m.detailPageIndex = 0
  if m.detailPageIndex >= count then m.detailPageIndex = count - 1
  m.detailBody.text = m.detailPages[m.detailPageIndex]
  m.top.findNode("detailPage").text = "PAGE " + (m.detailPageIndex + 1).ToStr() + " OF " + count.ToStr()
  thumbHeight = Int(356 / count)
  if thumbHeight < 42 then thumbHeight = 42
  m.detailScrollThumb.height = thumbHeight
  travel = 356 - thumbHeight
  thumbY = 586
  if count > 1 then thumbY = 586 + Int((travel * m.detailPageIndex) / (count - 1))
  m.detailScrollThumb.translation = [1746, thumbY]
end sub

sub moveArticlePage(delta as Integer)
  nextPage = m.detailPageIndex + delta
  if nextPage < 0 then nextPage = 0
  if nextPage >= m.detailPages.Count() then nextPage = m.detailPages.Count() - 1
  if nextPage <> m.detailPageIndex
    m.detailPageIndex = nextPage
    renderArticlePage()
  end if
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

sub onLiveSelected()
  if m.live = invalid or not m.live.isLive or m.live.streamUrl = invalid or m.live.streamUrl = ""
    m.statusLabel.text = "The Courier is not live right now. Check back at the scheduled time."
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
    m.statusLabel.text = "Weather is unavailable. The Courier will retry automatically."
    return
  end if
  m.top.findNode("weatherLocation").text = safeString(m.weather.location)
  m.top.findNode("weatherTemperature").text = m.weather.temperature.ToStr() + "°"
  m.top.findNode("weatherCondition").text = safeString(m.weather.condition)
  details = "Feels like " + m.weather.feelsLike.ToStr() + "°  ·  High " + m.weather.high.ToStr() + "°  ·  Low " + m.weather.low.ToStr() + "°"
  details = details + Chr(10) + "Wind " + safeString(m.weather.wind) + "  ·  Humidity " + m.weather.humidity.ToStr() + "%"
  m.top.findNode("weatherDetails").text = details
  m.top.findNode("weatherAlert").text = safeString(m.weather.alert)
  m.weatherOverlay.visible = true
end sub

sub onConnectSelected()
  m.pairOverlay.visible = true
  m.pairSuccess.visible = false
  m.top.findNode("pairCode").text = "CREATING…"
  m.top.findNode("pairUri").text = m.apiBase + "/login/tv?target=roku"
  m.pairQr.uri = ""
  m.top.findNode("pairStatus").text = "Creating a secure single-use request…"
  m.pairCountdown.text = "New code in 60s"
  m.pairRetry.visible = false
  m.pairClose.setFocus(true)
  beginPairing()
end sub

sub beginPairing()
  m.pairTimer.control = "stop"
  m.pairCountdownTimer.control = "stop"
  m.pairSession = invalid
  m.pairPhase = "waiting"
  m.pairSeconds = 60
  m.pairPollInFlight = false
  m.pairSpinner.visible = false
  m.pairProcessingShade.opacity = 0
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
    m.top.findNode("pairCode").text = "NO CODE"
    m.pairRetry.visible = true
    m.pairRetry.setFocus(true)
    return
  end if
  m.pairSession = result
  if result.lifetimeSeconds <> invalid then m.pairSeconds = result.lifetimeSeconds
  m.top.findNode("pairCode").text = result.userCode
  m.top.findNode("pairUri").text = result.verificationUri
  m.pairQr.uri = result.qrImageUrl
  m.top.findNode("pairStatus").text = "Waiting for a secure scan. Make sure both screens show " + result.userCode + "."
  m.pairCountdown.text = "New code in " + m.pairSeconds.ToStr() + "s"
  m.pairRetry.visible = false
  if result.pollIntervalSeconds <> invalid then m.pairTimer.duration = result.pollIntervalSeconds
  m.pairTimer.control = "start"
  m.pairCountdownTimer.control = "start"
end sub

sub onPairCountdown()
  if m.pairPhase <> "waiting" return
  m.pairSeconds = m.pairSeconds - 1
  if m.pairSeconds <= 0
    m.top.findNode("pairStatus").text = "Code expired safely. Creating a fresh single-use code…"
    beginPairing()
  else
    m.pairCountdown.text = "New code in " + m.pairSeconds.ToStr() + "s"
  end if
end sub

sub onPairTimer()
  if m.pairSession = invalid or m.pairPollInFlight or m.pairPhase = "success" return
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
  if result.status = "processing"
    m.pairPhase = "processing"
    m.pairCountdownTimer.control = "stop"
    m.pairCountdown.text = "CODE FROZEN · SECURE VERIFICATION IN PROGRESS"
    m.pairQr.opacity = 0.24
    m.pairProcessingShade.opacity = 0.62
    m.pairSpinner.visible = true
    m.top.findNode("pairStatus").text = "QR scan received. Complete verification on your signed-in device."
    m.pairRetry.visible = false
  else if result.status = "approved" and result.accessToken <> invalid
    m.pairPhase = "success"
    m.pairTimer.control = "stop"
    m.pairCountdownTimer.control = "stop"
    m.accessToken = result.accessToken
    registry = CreateObject("roRegistrySection", "Harborline")
    registry.Write("deviceToken", m.accessToken)
    registry.Flush()
    name = "Courier reader"
    if result.account <> invalid and result.account.name <> invalid then name = result.account.name
    channel = "production"
    if result.account <> invalid and result.account.releaseChannel <> invalid then channel = result.account.releaseChannel
    applyReleaseChannel(channel)
    m.accountLabel.text = "Connected as " + name
    buildNavigation()
    m.top.findNode("pairSuccessCopy").text = "Connected as " + name + " · Returning in 5…"
    m.pairSuccess.visible = true
    m.pairSuccessTimer.control = "start"
    reportPresence()
  else if result.status = "expired"
    m.top.findNode("pairStatus").text = "The secure request expired. Creating a new code…"
    beginPairing()
  else if result.status <> "pending"
    m.pairTimer.control = "stop"
    m.pairCountdownTimer.control = "stop"
    m.top.findNode("pairStatus").text = "This request was denied or already used. Select Try again."
    m.pairRetry.visible = true
    m.pairRetry.setFocus(true)
  end if
end sub

sub onPairSuccess()
  m.pairSuccess.visible = false
  m.pairOverlay.visible = false
  m.pairSession = invalid
  loadContent()
  m.navList.setFocus(true)
end sub

sub onPairRetry()
  if m.pairPhase = "processing" return
  m.top.findNode("pairStatus").text = "Creating a new secure request…"
  m.pairRetry.visible = false
  beginPairing()
end sub

sub onPairClose()
  m.pairTimer.control = "stop"
  m.pairCountdownTimer.control = "stop"
  m.pairOverlay.visible = false
  m.pairSuccess.visible = false
  m.navList.setFocus(true)
end sub

sub validateSession()
  task = createApiTask("session", "onSession")
  task.control = "RUN"
end sub

sub onSession(event as Object)
  result = event.GetData()
  removeTask(event)
  if result <> invalid and result.ok
    applyReleaseChannel(result.releaseChannel)
    m.accountLabel.text = "Connected as " + safeString(result.name)
    buildNavigation()
  else
    m.accessToken = ""
    applyReleaseChannel("production")
    registry = CreateObject("roRegistrySection", "Harborline")
    registry.Delete("deviceToken")
    registry.Flush()
    m.accountLabel.text = "Public access"
    buildNavigation()
  end if
end sub

sub applyReleaseChannel(value as Dynamic)
  channel = LCase(safeString(value))
  if channel <> "alpha" and channel <> "beta" then channel = "production"
  m.releaseChannel = channel
  m.releaseFlair.visible = channel <> "production"
  if channel = "alpha"
    m.releaseFlairLabel.text = "ALPHA"
  else
    m.releaseFlairLabel.text = "BETA"
  end if
end sub

function hasPrereleaseAccess() as Boolean
  return m.releaseChannel = "alpha" or m.releaseChannel = "beta"
end function

sub reportPresence()
  task = createApiTask("presence", "onPresence")
  task.control = "RUN"
end sub

sub onPresence(event as Object)
  removeTask(event)
end sub

sub onThemeSelected()
  if m.themePreference = "system"
    if m.systemTheme = "dark"
      m.themePreference = "light"
    else
      m.themePreference = "dark"
    end if
  else
    m.themePreference = "system"
  end if
  registry = CreateObject("roRegistrySection", "Harborline")
  registry.Write("theme", m.themePreference)
  registry.Flush()
  applyTheme()
  buildNavigation()
end sub

sub applyTheme()
  resolved = m.themePreference
  if resolved = "system" then resolved = m.systemTheme
  if resolved = "light"
    m.background.color = "0xF3F0E9FF"
    m.brand.color = "0x08263AFF"
    m.tagline.color = "0x526B78FF"
    m.accountLabel.color = "0x526B78FF"
    m.rule.color = "0xC49545FF"
    m.heroCategory.color = "0xA56600FF"
    m.latestLabel.color = "0x08263AFF"
    m.statusLabel.color = "0x526B78FF"
  else
    m.background.color = "0x071C2CFF"
    m.brand.color = "0xFFFFFFFF"
    m.tagline.color = "0x9EB6C3FF"
    m.accountLabel.color = "0x9EB6C3FF"
    m.rule.color = "0xC49545FF"
    m.heroCategory.color = "0xD5A24BFF"
    m.latestLabel.color = "0xFFFFFFFF"
    m.statusLabel.color = "0x91A9B6FF"
  end if
end sub

sub removeTask(event as Object)
  task = event.GetRoSGNode()
  if task <> invalid then m.top.removeChild(task)
end sub

function safeString(value as Dynamic) as String
  if value = invalid return ""
  return value.ToStr()
end function

function absoluteMediaUrl(value as Dynamic) as String
  uri = safeString(value)
  if uri = "" return ""
  if Left(uri, 1) = "/" then return m.apiBase + uri
  return uri
end function

function titleCase(value as String) as String
  if value = "" return value
  return UCase(Left(value, 1)) + Mid(value, 2)
end function

function storyNoteLabel(noteType as String) as String
  if noteType = "reporting_note" return "REPORTING NOTE"
  if noteType = "update_note" return "UPDATE NOTE"
  return "EDITOR'S NOTE"
end function

function hasStoryItems() as Boolean
  if m.storyList.content = invalid return false
  row = m.storyList.content.GetChild(0)
  return row <> invalid and row.GetChildCount() > 0
end function

function onKeyEvent(key as String, press as Boolean) as Boolean
  if not press return false

  if m.detailOverlay.visible
    if key = "back"
      m.detailOverlay.visible = false
      m.storyList.jumpToRowItem = m.lastStoryPosition
      m.storyList.setFocus(true)
    else if key = "up" or key = "rewind"
      moveArticlePage(-1)
    else if key = "down" or key = "fastforward"
      moveArticlePage(1)
    end if
    return true
  end if

  if m.video.visible
    if key = "back"
      m.video.control = "stop"
      m.video.visible = false
      m.navList.setFocus(true)
      return true
    end if
    return false
  end if

  if m.pairOverlay.visible
    if key = "back"
      if m.pairPhase <> "success" then onPairClose()
      return true
    else if key = "left" and m.pairRetry.visible
      m.pairRetry.setFocus(true)
    else if key = "right"
      m.pairClose.setFocus(true)
    end if
    return true
  end if

  if m.weatherOverlay.visible
    if key = "back"
      m.weatherOverlay.visible = false
      m.navList.setFocus(true)
    end if
    return true
  end if

  if m.navList.hasFocus() and key = "down"
    if hasStoryItems()
      m.storyList.setFocus(true)
    else
      m.statusLabel.text = "This section has no published stories. Choose another desk above."
    end if
    return true
  else if m.storyList.hasFocus() and key = "up"
    m.navList.setFocus(true)
    return true
  end if
  return false
end function
