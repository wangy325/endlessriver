/*
 * @Author: wangy325
 * @Date: 2024-08-16 03:21:47
 * @Description: unused yet
 */
function createToC() {
    let primaryHeading = 6;
    let headings = [];
    $("main :header").each(
      (index, header) => {
        let level = header.tagName.slice(-1);
        if(level < primaryHeading) primaryHeading = level;
        headings.push({
          level: level,
          id: header.id,
          title: header.innerHTML
        });
      }
    );
    let root = $(document.createElement('ul'))
      .appendTo($("#toc"));
    let parents = [root];
    let prevLevel = primaryHeading;
    let parentIndex = 0;
    headings.forEach(
      (heading, index) => {
        if (heading.level < prevLevel)
          parentIndex -= prevLevel - heading.level;
        else
          for (let i=prevLevel; i < heading.level; i++, parentIndex++)
            parents[parentIndex + 1] = $(document.createElement('ul'))
              .appendTo(parents[parentIndex]);
        prevLevel = heading.level;
        $(document.createElement('a'))
          .attr("href", "#" + heading.id)
          .html(heading.title)
          .appendTo($(document.createElement('li'))
            .appendTo(parents[parentIndex]));
      }
    );
  }