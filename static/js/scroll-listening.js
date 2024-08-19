/*
 * @Author: wangy325
 * @Date: 2024-08-16 03:17:57
 * @Description: 
 */





window.addEventListener("scroll", () => tocTrack())
window.onload = function () {
  // inportJs('/js/md5.js')
}

const inportJs = (url) => {
  var script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', url);
  document.getElementsByTagName('head')[0].appendChild(script);
}


// 找出正文标题
const listAllHeadings = () => {
  const headlines = document.querySelectorAll("article h1, article h2, article h3, article h4, article h5, article  h6");
  const head = [].slice.apply(headlines).filter(function (item) {
    return item.getAttribute("id") != null
  })
  return head
}

let currentHeading = null;

const has = listAllHeadings();

// test
/* for (let h of has) {
   const headingLevel = h.tagName.toLowerCase()
   const headingName = h.innerText.trim();
   console.log(headingLevel, headingName);
 }*/



const removeAllOtherActiveClasses = () => {
  const list = document.querySelectorAll("#toc-new .nav-item a")
  Array.from(list, v => v.classList.remove("active"))
}


const tocTrack = () => {

  // 当前所在标题
  for (let heading of has) {
    if (heading.offsetTop - document.scrollingElement.scrollTop > 20) {
      break
    }
    currentHeading = heading
  }

  // let anchorId = currentHeading.getAttribute('id') + ''
  let anchorId
  try {
    anchorId = currentHeading.innerText.slice(0, -2)
  } catch (e) {
    console.log(e)
    return
  }
  // 应对乱七八糟的文档目录
  let sps = anchorId.replace(/[\(\)-\.\@]/g, '').split(" ")
  if (sps.length > 2) {
    anchorId = "t" + sps[1] + sps[2]
  }
  else if (sps.length == 2) {
    anchorId = "t" + sps[1]
  } else {
    anchorId = "t" + sps[0]
  }
  // console.log('md5 anchorId: ' + anchorId)

  // anchorId = 't' + anchorId.slice(0, -2)
  var toc_active = document.querySelectorAll(`#toc-new .nav-item #${anchorId}`)
  removeAllOtherActiveClasses()
  Array.from(toc_active, v => v.classList.add("active"))
  // does not work  use selectAll 
  // toc_active.classList.remove("active")

};






