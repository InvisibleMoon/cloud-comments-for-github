// 前端缓存，记录必要信息，减少请求数
var comments = []
// user id
var uid = 0

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    switch (request.type) {
      case 'update':
        waitForComplete(function() {
          // 需要进一步抽象
          uid = request.uid
          
          list(request.url)
          inject(request.url)
        })
        break
      default:
    }
  }
);

waitForComplete(function() {
  chrome.runtime.sendMessage({
    type: "inject"
  })
})

/********************/

function inject(url) {
  if (!url) {
    return
  }
  
  if (url.search('#') === -1) {
    return;
  }
  
  if ($('#js-cloud-comment').length === 0) {
    var node = String.raw`<li><a class="dropdown-item" id="js-cloud-comment" role="menuitem" href="#"></a></li>`
    $('#js-copy-lines').parent().parent().append(node)
  }
  var commentId = getId(url.substring(url.search('#') + 1))
  var comment = getComment(url.substring(url.search('#') + 1))  
  $('#js-cloud-comment').text(!commentId ? "Add Cloud Comment" : "Modify Cloud Comment")
  $('#js-cloud-comment').off()
  $('#js-cloud-comment').click(function(e) {
    e.preventDefault()
    
    var content = prompt("Wanna say something? Input your comment and then submit it!", !commentId ? "" : comment.attributes.content)
    if (content === null) {
      return
    }
    
    if (!commentId) {
      addReq(content)
    }
    else if (content === "") {
      removeReq()
    }
    else {
      modifyReq(content)
    }
  })
}

function list(url) {
  if (!url) {
    return
  }
  
  listReq()
}

/********************/

function waitForComplete(func) {
  if (!func) {
    return
  }
  
	var readyStateCheckInterval = setInterval(function() {
	if (document.readyState === "complete") {
		clearInterval(readyStateCheckInterval);
    func()
	}
	}, 10);
}

function getPermalink() {
  var selector = $("#js-repo-pjax-container > div.container > div.repository-content > a")
  return selector.href || selector[0].href
}

function getParams() {
  var idx = document.URL.lastIndexOf('#')
  return document.URL.substr(idx + 1)
}

function getLines(params) {
  var anchorL = params.indexOf('L')
  var anchorR = params.lastIndexOf('L')
  if (anchorL === anchorR) {
    var loc = params.substring(anchorL + 1)
    return [loc, loc]
  }
  else {
    var split = params.indexOf('-')
    var startLoc = params.substring(anchorL + 1, split)
    var endLoc = params.substring(anchorR + 1)
    return [startLoc, endLoc]
  }
}

function getId(params) {
  var filtedComments = comments.filter(function(item) {
    return (item.attributes.params === params && item.attributes.owner.objectId === uid)
  })
  return filtedComments.length > 0 ? filtedComments[0].id : undefined
}

function getComment(params) {
  var filtedComments = comments.filter(function(item) {
    return (item.attributes.params === params && item.attributes.owner.objectId === uid)
  })
  return filtedComments[0]
}

function removeComment(params) {
  var idx = comments.findIndex(function(item) {
    return (item.attributes.params === params && item.attributes.owner.objectId === uid)
  })
  comments.splice(idx, 1)
}

/*******************/

function addReq(cont) {
  chrome.runtime.sendMessage({
    type: 'add',
    url: getPermalink(),
    params: getParams(),
    content: cont,
    uid: uid,
  }, function(res) {
    comments.push(res)
    
    var [startLoc, endLoc] = getLines(res.attributes.params)
    var content = $(`<tr class="cloud-comment-item">
      <td></td>
      <td id=CC${res.id} class="blob-code blob-code-inner js-file-line cloud-comment">${res.attributes.content}</td>
    </tr>`)
    content.insertBefore($(`td[id=LC${startLoc}]`).parent())
  });
}

function removeReq() {
  var params = getParams()
  chrome.runtime.sendMessage({
    type: 'remove',
    id: getId(params),
    uid: uid,
  }, function(res) {
    removeComment(params)
    
    $(`#CC${res.id}`).parent().remove()
  });
}

function modifyReq(cont) {
  var params = getParams()
  chrome.runtime.sendMessage({
    type: 'modify',
    content: cont,
    id: getId(params),
    uid: uid,
  }, function(res) {
    var comment = getComment(params)
    comment.attributes.content = res.attributes.content
    
    $(`#CC${res.id}`).text(res.attributes.content)
  });
}

function listReq() {
  chrome.runtime.sendMessage({
    type: 'list',
    url: getPermalink(),
  }, function(res) {
    comments = res
    
    $('tr.cloud-comment-item').remove()
    res.forEach(function(item) {
      var [startLoc, endLoc] = getLines(item.attributes.params)
      
      var content = $(`<tr class="cloud-comment-item">
        <td></td>
        <td id=CC${item.id} class="blob-code blob-code-inner js-file-line cloud-comment">${item.attributes.content}</td>
      </tr>`)
      content.insertBefore($(`td[id=LC${startLoc}]`).parent()) 
      //for (var loc = startLoc; loc <= endLoc; loc++) {
      //  $(`td[id=LC${loc}]`).addClass("highlighted")
      //}
    })
  });
}