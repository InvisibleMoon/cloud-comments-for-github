// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });
//var { Realtime, TextMessage } = require('leancloud-realtime');

(function() {
  var APP_ID = '';
  var APP_KEY = '';

  AV.init({
    appId: APP_ID,
    appKey: APP_KEY
  });
  
  /*
  var realtime = new Realtime({
    appId: APP_ID,
    appKey: APP_KEY,
  });
  */
})()

chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    switch (request.type) {
    case "add":
      add(sendResponse, request)
      break
    case "remove":
      remove(sendResponse, request)
      break
    case "modify":
      modify(sendResponse, request)
      break
    case "list":
      list(sendResponse, request)
      break
    case "inject":
      chrome.pageAction.show(sender.tab.id)
      break
    default:
      break
    }
    
    return true
  }
);

chrome.tabs.onUpdated.addListener(
  function(tabId, changeInfo, tab) {
    // 规则待修正
    if (!changeInfo.favIconUrl && tab.title.search(' at ') !== -1 && tab.status == 'complete' && tab.url.search('/blob/') !== -1) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'update',
        url: tab.url,
        uid: isAuthenticated() ? getCurrentUser().id : undefined,
      });
    }
  }
);

/*******/

// 首先尝试注册，如果成功则登录并刷新页面，如果用户名密码无误则直接登录，否则返回错误信息
function session(username, password, succ, fail) {
  register(username, password, function(user) {
    login(username, password, function(user) {
      succ(user.attributes.username)
    }, function(error) {
      fail(error.rawMessage)
    })
  }, function(error) {
    switch (error.code) {
    case 202:
      login(username, password, function(user) {
        succ(user.attributes.username)
      }, function(error) {
        fail(error.rawMessage)
      })
      break
    default:
      fail(error.rawMessage)
    }
  })
}

/*******/

function sendMessageWrapper(func, boardcast) {
  if (!func) {
    return
  }
  
  if (boardcast === true) {
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(function(tab) {
        chrome.tabs.sendMessage(tab.id, {
          
        }, function() {});
      })
    });
  }
  else {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          
        }, function() {});
      }
    });
  }
}

function isAuthenticated() {
  return AV.User.current() !== null
}

function isSelf(uid) {
  return AV.User.current() !== null ? AV.User.current().id === uid : false
}

function getCurrentUser() {
  return AV.User.current()
}
  
function register(username, password, succ, fail) {
  var user = new AV.User()
  user.setUsername(username)
  user.setPassword(password)
  user.signUp().then(function(res) {
    succ(res)
  }, function(error) {
    console.log(error)
    fail(error)
  })
}
  
function login(username, password, succ, fail) {
  AV.User.logIn(username, password).then(function(res) {
    succ(res)
  }, function(error) {
    console.log(error)
    fail(error)
  });
}

function logout(succ, fail) {
  AV.User.logOut().then(function(res) {
    succ(res)
  }, function(error) {
    console.log(error)
    fail(error)
  })
}

function add(sendResponse, params) {
  if (!isAuthenticated()) {
    console.log("auth token not found")
    return
  }
  
  var Comment = AV.Object.extend('Comment');
  
  var acl = new AV.ACL()
  acl.setPublicReadAccess(true)
  acl.setWriteAccess(AV.User.current(), true)
  
  var comment = new Comment()
  comment.set('url', params.url)
  comment.set('content', params.content)
  comment.set('params', params.params)
  comment.set('owner', getCurrentUser())
  
  // 点赞信息
  //var CommentExtra = AV.Object.extend('CommentExtra')
  
  comment.setACL(acl)
  comment.save().then(function(res) {
    // 与 list 统一
    delete res.attributes.ACL
    res.attributes.owner = {
      objectId: res.attributes.owner.id
    }
    
    sendResponse({
      attributes: res.attributes,
      id: res.id
    })
  }, function(error) {
    console.log(error)
  })
}

function remove(sendResponse, params) {
  if (!isAuthenticated()) {
    console.log("auth token not found")
    return
  }
  
  var acl = new AV.ACL()
  acl.setPublicReadAccess(false)
  acl.setWriteAccess(AV.User.current(), true)
  
  var comment = AV.Object.createWithoutData('Comment', params.id)
  comment.set('hidden', true)
  
  comment.setACL(acl)
  comment.save().then(function(res) {
    sendResponse({
      attributes: res.attributes,
      id: res.id
    })
  }, function(error) {
    console.log(error)
  })
}

function modify(sendResponse, params) {
  if (!isAuthenticated()) {
    console.log("auth token not found")
    return
  }
  
  var comment = AV.Object.createWithoutData('Comment', params.id)
  comment.set('content', params.content)
  comment.save().then(function(res) {
    sendResponse({
      attributes: res.attributes,
      id: res.id
    })
  }, function(error) {
    console.log(error)
  })
}

function list(sendResponse, params) {
  var contentQuery = new AV.Query('Comment');
  contentQuery.equalTo('url', params.url);
  var hiddenQuery = new AV.Query('Comment');
  hiddenQuery.notEqualTo('hidden', true);
  
  AV.Query.and(contentQuery, hiddenQuery).find().then(function(results) {
    // 这里有个坑，results 无法被正确序列化，导致 sendResponse 无响应，所以 map 后把需要的数据扔出来
    sendResponse(results.map(x => ({
      attributes: x.attributes,
      id: x.id
    })))
  }, function(error) {
    console.log(error)
  })
}

function loginim(succ, fail) {
  if (!isAuthenticated()) {
    console.log("auth token not found")
    return
  }
  
  realtime.createIMClient(getCurrentUser()).then(function(client) {
    succ(client)
  }, function(error) {
    console.log(error)
    fail(error)
  })
}

function logoutim() {
  if (!isAuthenticated()) {
    console.log("auth token not found")
    return
  }
  
  loginim(function(client) {
    client.close()
  }, function() {})
}

function sendmsg(client, friend, content) {
  if (!isAuthenticated()) {
    console.log("auth token not found")
    return
  }
  
  client.createConversation({
    members: [friend],
    name: `${friend}`,
    unique: true
  }).then(function(conversation) {
    conversation.send(new TextMessage(content)).then(function(msg) {
      console.log(msg)
    }, function(error) {
      console.log(error)
    })
  }, function(error) {
    console.log(error)
  })
}

function recvmsg(client) {
  if (!isAuthenticated()) {
    console.log("auth token not found")
    return
  }
  
  client.on(Event.MESSAGE, function(msg, conversation) {
    console.log(msg)
  })
}