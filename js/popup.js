'use strict'

chrome.runtime.getBackgroundPage((bg) => {
  console.log('popup')
  // add left click support for open a new tab
  function openChannel(el, channel) {
    // console.log('add click for channel', channel)
    el.onclick = function (e) {
      e.preventDefault()
      e.stopPropagation()
      if (bg.myChannel.newtab) { // left button
        bg.myChrome.getSelected(function (tab) {
          if (tab.url) {
            bg.myChrome.createTab({
              url: channel.url,
              active: true
            })
          } else { //current tab is a new tab
            bg.myChrome.updateTab({
              url: channel.url,
              active: true
            })
          }
        })
      } else {
        bg.myChrome.updateTab({
          url: channel.url,
          active: true
        })
      }
    }
  }

  // add click function for subscribe/unsubscribe
  function toggleSubscribe(el, channel) {
    // console.log('add click for subcribe button', channel)
    el.onclick = function (e) {
      e.preventDefault()
      e.stopPropagation()
      var index = bg.myChannel.getIndex(channel)
      if (index !== -1) { // remove a channel
        el.innerText = bg.myChrome.getMessage('subscribe')
        el.classList.remove('subscribed')
        el.classList.add('subscribe')
        bg.deleteChannel(channel)
        removeDom(channel)
      } else { // add a channel
        el.innerText = bg.myChrome.getMessage('unsubscribe')
        el.classList.add('subscribed')
        el.classList.remove('subscribe')
        bg.addChannel(channel)
        addDom(channel)
      }
    }
  }

  // add a toggle subscribe button for avaliabe channel
  function isChannel() {
    console.log('is channel start')
    var button = document.getElementById('subscribe')
    bg.myChrome.getSelected(function (tab) {
      var room = bg.myChannel.getDomainAndId(tab.url)
      bg.getChannel(room, function (data) {
        bg.updateChannel(room, data, function (channel) {
          console.log('got channel data', channel)
          if (channel && !channel.timout) {
            button.classList.remove('none')
            var index = bg.myChannel.getIndex(channel)
            if (index !== -1) {
              button.innerText = bg.myChrome.getMessage('unsubscribe')
              button.classList.remove('subscribe')
              button.classList.add('subscribed')
            } else {
              button.innerText = bg.myChrome.getMessage('subscribe')
              button.classList.remove('subscribed')
              button.classList.add('subscribe')
            }
            toggleSubscribe(button, channel)
          }
        })
      })
    })
  }

  // when toggle subscribe, remove channel element
  function removeDom(channel) {
    // console.log('remove dom', channel)
    var el = document.getElementById(channel.domain + channel.id)
    el.remove()
    if (bg.myChannel.channels.length === 0) {
      var template = document.getElementsByClassName('channel_template')[0]
      template.classList.remove('none')
    }
  }

  function addDom(channel, template, fragment) {
    // console.log('add dom', channel)
    // var el = template.cloneNode(true)
    // el.classList.remove('channel_template', 'none')
    var el = createDom(channel, template)
    updateEle(el, channel)
    openChannel(el, channel)
    if (!fragment) {
      var parentNode = document.getElementById('channels_list')
      if (bg.myChannel.onlinefirst && channel.online) {
        var refNode = parentNode.getElementsByClassName('channel_template')[0]
        parentNode.insertBefore(el, refNode.nextSibling)
      } else {
        parentNode.appendChild(el)
      }
    } else {
      fragment.appendChild(el)
    }
  }

  // dom is created everytime when pupup.html popup
  function createDom(channel, template) {
    // console.log('create dom', channel)
    if (!template) {
      template = document.getElementsByClassName('channel_template')[0]
    }
    if (!template.classList.contains('none')) {
      template.classList.add('none')
    }
    var el = template.cloneNode(true)
    var id = channel.domain + channel.id
    el.id = id
    el.classList.remove('channel_template', 'none')
    el.classList.add('channel')
    return el
  }

  function openOptions() {
    document.getElementById('options').innerText = bg.myChrome.getMessage('options')
    document.getElementById('options').addEventListener('click', function () {
      if (chrome.runtime.openOptionsPage) {
        // New way to open options pages, if supported (Chrome 42+).
        chrome.runtime.openOptionsPage()
      } else {
        // Reasonable fallback.
        window.open(chrome.runtime.getURL('html/options.html'))
      }
    })
  }

  // update dom after schedule update
  function updateDom(channel) {
    // console.log('update dom', channel)
    var id = channel.domain + channel.id
    var el = document.getElementById(id)
    if (el) {
      if (bg.myChannel.onlinefirst) {
        var parentNode = document.getElementById('channels_list')
        var a = el.getElementsByClassName('detail')[0]
        if (a.classList.contains('offline') && channel.online) {
          // move online channel to the top
          var refNode = parentNode.getElementsByClassName('channel_template')[0]
          parentNode.insertBefore(el, refNode.nextSibling)
        } else if (a.classList.contains('online') && !channel.online) {
          // move offline channel to the bottom
          parentNode.appendChild(el)
        } else {
          console.log('channel status not changed', channel)
        }
      }
      updateEle(el, channel)
    } else {
      addDom(channel)
    }
  }

  // change online && title
  function updateEle(el, channel) {
    // console.log('update el', el, channel)
    var a = el.getElementsByClassName('detail')[0]
    var lastonline = el.getElementsByClassName('lastonline')[0]
    var lastupdated = el.getElementsByClassName('lastupdated')[0]
    var online, name, title, nickname
    if (channel.nickname) {
      nickname = channel.nickname
    } else {
      nickname = ''
    }
    if (bg.myChannel.hidename) {
      name = ' ' + nickname
    } else {
      name = ' ' + nickname + ' ' + channel.name
    }
    if (bg.myChannel.hidetitle) {
      title = ''
    } else {
      title = channel.title || ''
    }
    a.href = channel.url
    a.title = channel.url
    if (bg.myChannel.hide_lastonline) {
      lastonline.classList.add('none')
    } else {
      if (channel.start_time || channel.end_time) {
        lastonline.innerText = (channel.start_time || '--') + ' - ' + (channel.end_time || '--')
      }
    }
    if (channel.timestamp) {
      var minutes = Math.ceil((Date.now() - channel.timestamp) / 1000 / 60)
      lastupdated.innerText = minutes + ' ' + bg.myChrome.getMessage('minutes')
    }
    if (channel.timeout) {
      online = bg.myChrome.getMessage('timeout')
      a.classList.remove('online', 'offline')
      a.classList.add('timeout')
      a.innerText = online + name + ' ' + title
    } else if (channel.online) {
      online = bg.myChrome.getMessage('online')
      a.classList.remove('offline', 'timeout')
      a.classList.add('online')
      a.innerText = online + name + ' ' + title
    } else {
      online = bg.myChrome.getMessage('offline')
      a.classList.remove('online', 'timeout')
      a.classList.add('offline')
      a.innerText = online + name + ' ' + title
    }
  }

  function translate() {
    var template = document.getElementsByClassName('channel_template')[0]
    var a = template.getElementsByClassName('detail')[0]
    var lastonline = template.getElementsByClassName('lastonline')[0]
    var lastupdated = template.getElementsByClassName('lastupdated')[0]
    a.innerText = bg.myChrome.getMessage('no_channels')
    lastonline.innerText = bg.myChrome.getMessage('last_online')
    lastupdated.innerText = bg.myChrome.getMessage('last_updated')
  }

  function showChannels() {
    console.log('show channels')
    if (bg.myChannel.channels.length > 0) {
      var fragment = document.createDocumentFragment()
      var template = document.getElementsByClassName('channel_template')[0]
      var timeout = false
      var online = false
      template.classList.add('none')
      // online frag
      var first = document.createDocumentFragment()
      // timeout frag
      var third = document.createDocumentFragment()
      // offline frag
      let second
      if (bg.myChannel.onlinefirst) {
        second = document.createDocumentFragment()
      } else {
        second = first
      }
      for (let channel of bg.myChannel.channels) {
        if (channel.online) {
          online = true
          addDom(channel, template, first)
        } else if (channel.timeout) {
          timeout = true
          addDom(channel, template, third)
        } else {
          addDom(channel, template, second)
        }
      }
      if (online) {
        fragment.appendChild(first)
      }
      fragment.appendChild(second)
      if (timeout) {
        fragment.appendChild(third)
      }
      console.log('fragment done, ready to append to dom')
      document.getElementById('channels_list').appendChild(fragment)
    } else {
      console.log('No channel', bg.myChannel.channels)
    }
  }

  function isExpire() {
    bg.scheduleUpdate(function (channel) {
      if (channel && channel.domain && channel.id !== null && channel.id !== undefined) {
        if (channel.timeout) {
          bg.myChannel.timestamp = 0
          console.log('Timeout when get channel info', channel)
        } else {
          bg.myChannel.addChannel(channel)
          bg.updateIcon()
          bg.myChrome.setLocal(bg.myChannel.exportChannel(channel))
          // bg.saveChannel(channel)
          updateDom(channel)
        }
      } else {
        console.error('popup update error', channel)
        bg.myChannel.timestamp = 0
      }
    })
  }

  function start() {
    translate()
    openOptions()
    isChannel()
    showChannels()
    isExpire()
  }
  // start
  // create dom use bg.myChannel.channels
  // todo: first display popup.html then add channel item one by one
  console.time('start')
  start()
  console.timeEnd('start')
})
