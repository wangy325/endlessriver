// to shore the navi bar status
// after page refresh
// restore menu and toc style


// works. but conflict with checked css
// and page load too slow...

window.addEventListener('load', resizeBody)

function resizeBody() {
    console.log('load page...')
    const toc = document.getElementsByClassName('book-toc');
    if (toc.length == 0) {
        // doc no toc
        document.getElementById('toc-navi').style.checked = true
        document.getElementsByClassName('book-page')[0].style.right = 0
    }
}

function loadNavi() {
    if (localStorage.getItem('mhidden') === 'true') {
        console.log('hidden menu')
        document.getElementsByClassName('book-menu')[0].style.display = "none";
    } else {
        console.log('show menu')
        document.getElementById('menu-navi').style.checked = true
        document.getElementsByClassName('book-menu')[0].style.display = "block";
        document.getElementsByClassName('book-menu')[0].style.opacity = 1;
    }
    if (document.getElementsByClassName('book-toc').length > 0) {
        if (localStorage.getItem('thidden') === 'true') {
            console.log('hidden toc')
            document.getElementsByClassName('book-toc')[0].style.display = "none";
        } else {
            console.log('show toc...')
            document.getElementsByClassName('book-toc')[0].style.display = "block";
            document.getElementsByClassName('book-toc')[0].style.opacity = 1;
        }
    }
}

window.onclose = function () {
    localStorage.removeItem('mhidden')
    localStorage.removeItem('thidden')
}

const mb = document.getElementById('menu-navi');
// mb.addEventListener('click', () => mh())

const tb = document.getElementById("toc-navi")
// tb.addEventListener('click', () => th())


function mh() {
    if (document.getElementById("menu-navi").checked) {
        localStorage.setItem('mhidden', 'false')
        console.log('menu show..')
    }
    else {
        localStorage.setItem('mhidden', 'true')
        console.log('menu hidden..')
    }

}

function th() {
    if (document.getElementById("toc-navi").checked) {
        localStorage.setItem('thidden', 'false')
        console.log('toc show..')
    }
    else {
        localStorage.setItem('thidden', 'true')
        console.log('toc-hidden..')
    }
}
