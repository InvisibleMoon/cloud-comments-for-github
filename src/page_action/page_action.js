var bg = chrome.extension.getBackgroundPage()

$(function() {
  if (bg.isAuthenticated()) {
    var user = bg.getCurrentUser()
    showLoginPage(user.attributes.username)
  }
  else {
    showRegisterPage()
  }
  
  $("#target").submit(function(e) {
    e.preventDefault()
    
    var username = $("#username").val()
    var password = $("#password").val()
    bg.session(username, password, showLoginPage, showRegisterPageWithError)
  });
  
  $("#logout").click(function(e) {
    e.preventDefault()
    
    bg.logout(showRegisterPage, showLoginPageWithError)
  })
});

function showRegisterPage() {
  $("#target").show()
  $("#errormsg").text("")
  
  $("#welcome").hide()
}

function showLoginPage(username) {
  $("#target").hide()
  
  $("#welcome").show()
  $("#title").text("Welcome you, " + username)
  $("#errormsgw").text("")
}

function showRegisterPageWithError(errormsg) {
  $("#target").show()
  $("#errormsg").text(errormsg)
  
  $("#welcome").hide()
}

function showLoginPageWithError(errormsg) {
  $("#target").hide()
  
  $("#welcome").show()
  $("#title").text("")
  $("#errormsgw").text(errormsg)
}