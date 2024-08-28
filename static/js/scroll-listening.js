/*
 * @Author: wangy325
 * @Date: 2024-08-16 03:17:57
 * @Description: 
 * @Reference: https://qzy.im/blog/2020/02/generate-article-catalogs-and-switch-catalog-following-article-s-scroll-using-javascript/#%E7%9B%AE%E5%BD%95%E8%B7%9F%E9%9A%8F%E6%96%87%E7%AB%A0%E5%86%85%E5%AE%B9%E6%BB%9A%E5%8A%A8
 */

window.addEventListener("scroll", () => tocTrack())


// 找出正文标题
const listAllHeadings = () => {
  const headlines = document.querySelectorAll("article h1, article h2, article h3, article h4, article h5");
  const head = [].slice.apply(headlines).filter(function (item) {
    return item.getAttribute("id") != null
  })
  return head
}

let currentHeading = null;
const has = listAllHeadings();

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
// 有时候文章引子太长 上面的方法找不到当前标题
  if (currentHeading == null ) return 

  // let anchorId = currentHeading.getAttribute('id') + ''
  let anchorId
  try {
    anchorId = currentHeading.innerText.slice(0, -2)
  } catch (e) {
    console.log(e)
    return
  }
  // 应对乱七八糟的文档目录
  // 清除文档目录中的() - 和@
  // 中文标点如'（）' '？'作为id没影响
  let sps = anchorId.replace(/[\(\)-\.\@\"\?;= ]/g, '')
  
  anchorId = "t" + sps
  
  // console.log('anchorId: ' + anchorId)

  var toc_active = document.querySelectorAll(`#toc-new .nav-item #${anchorId}`)
  removeAllOtherActiveClasses()
  Array.from(toc_active, v => v.classList.add("active"))
  // does not work  use selectAll replaced
  // toc_active.classList.remove("active")

};
