---
title: "Java8日期和时间API"
date: 2021-02-02
categories: [java]
series: []
author: "wangy325"
weight: 11
---

# Java8日期和时间API

> mybatis自 3.4.5 开始，已经支持使用LocaldateTime作为时间查询入参，映射类型为TimeStamp，参考地址: https://mybatis.org/mybatis-3/zh/configuration.html#typeHandlers

# 1 前言

在介绍Java SE 8中新的日期时间库前，先了解下Java 8之前的日期时间工具的诟病。

在Java SE 8前，日期时间工具库在`java.util`包中，包括：

- `java.util.Date`：表示日期和时间
- `java.util.Calendar`以及其实现子类：表示各种日历系统，常用的是格林威治日历`java.util.GregorianCalendar`
- `java.util.TimeZone`以及其实现子类：表示时区偏移量和夏令时

以及辅助其进行格式化和解析的工具库在java.text包中，包括：

- `java.text.DateFormat`：格式化日期时间和解析日期时间的工具抽象类
- `java.text.SimpleDateFormat`：DateDateFormat的实现

<!--more-->

从以上的简述中，对java 8之前的日期时间库，有所宏观视觉。下面简要总结下其设计上的瑕疵和被开发者无限吐槽的诟病：

- 从以上的api上看，java 8之前的日期时间工具库缺乏年、月、日、时间、星期的单独抽象；
- `Date`日期时间类既描述日期又描述时间，耦合，且`Date`不仅在`java.util`包中存在，在`java.sql`中也存在，重复名称，容易导致bug发生；
- api的设计上晦涩，难用，不够生动，难以以自然人类的思维理解日期时间。年月日需要从`Calendar`中获取；
- 最被开发者抱怨的是**类型不安全**，`Calendar`类中全局属性是可变的，在多线程访问时，会存在线程安全问题。`SimpleDateFormat`格式化和解析日期，需要使用年月日时分秒，所以持有了`Calendar`属性，**导致其也是非线程安全**；

```java
// 以下都是Calendar中持有的全局属性
// 这些全局属性都是可变的，提供了set
protected int fields[];
transient private int stamp[];
protected long time;
protected boolean  isTimeSet;

// 在其子类GregorianCalendar中
private transient int[] zoneOffsets;

// setTime方法会调用此方法
// 该方法中修改了上述的很多全局属性
public void setTimeInMillis(long millis) {
        // If we don't need to recalculate the calendar field values,
        // do nothing.
        if (time == millis && isTimeSet && areFieldsSet && areAllFieldsSet
            && (zone instanceof ZoneInfo) && !((ZoneInfo)zone).isDirty()) {
            return;
        }
        time = millis;
        isTimeSet = true;
        areFieldsSet = false;
        computeFields();
        areAllFieldsSet = areFieldsSet = true;
}
```

所以在多线程环境中使用`Calendar`是非线程安全的 ，多个线程修改其属性域会导致**数据一致性和可见性**问题。

在`DateFormat`中持有了`Calendar`属性，用于解析和格式化日期：

```java
// 从注释上看，Calendar用于计算日期时间域
/**
 * The {@link Calendar} instance used for calculating the date-time fields
 * and the instant of time. This field is used for both formatting and
 * parsing.
 *
 * <p>Subclasses should initialize this field to a {@link Calendar}
 * appropriate for the {@link Locale} associated with this
 * <code>DateFormat</code>.
 * @serial
 */
protected Calendar calendar;

// Called from Format after creating a FieldDelegate
private StringBuffer format(Date date, StringBuffer toAppendTo,
                            FieldDelegate delegate) {
    // Convert input date to time field list
    calendar.setTime(date);

    boolean useDateFormatSymbols = useDateFormatSymbols();

    for (int i = 0; i < compiledPattern.length; ) {
        int tag = compiledPattern[i] >>> 8;
        int count = compiledPattern[i++] & 0xff;
        if (count == 255) {
            count = compiledPattern[i++] << 16;
            count |= compiledPattern[i++];
        }

        switch (tag) {
        case TAG_QUOTE_ASCII_CHAR:
            toAppendTo.append((char)count);
            break;

        case TAG_QUOTE_CHARS:
            toAppendTo.append(compiledPattern, i, count);
            i += count;
            break;

        default:
            subFormat(tag, count, delegate, toAppendTo, useDateFormatSymbols);
            break;
        }
    }
    return toAppendTo;
}
```

`format`方法中设置了全局成员`Calendar`的time，多线程访问时每次都会改变Calendar类，导致format格式化时会出现线程安全问题。所以`DateFormat`和其子类`SimpleDateFormat`都是**非类型安全**。

这个可以说是被开发者极度抱怨的。所以**在使用日期格式工具时大多数都会重新new或者使用ThreadLocal**。

基于此诸多问题，java设计者终于在Java SE 8中引入了新的日期时间库。新的日期时间库的易用程度会让你振服！下面开始进入主题，Java SE 8中的日期时间库`java.time`。

# 2 概览

先认识下[joda](joda.org)项目，joda项目包括：

- **Joda-Time - Basic types for Date and Time**
- Joda-Money - Basic types for Money
- Joda-Beans - Next generation JavaBeans
- Joda-Convert - String to Object conversion
- Joda-Collect - Additional collection data structures

其中`Joda-Time`是日期时间三方库，但是在java 8之前，joda time其实是标准的日期时间库，其出色的语义表达，易用易于理解的api，类型安全的特性，大受开发者的追捧。而且其日历系统遵循的是[IOS_8601](https://zh.wikipedia.org/wiki/ISO_8601#%E6%97%A5%E5%8E%86%E6%97%A5%E6%9C%9F%E8%A1%A8%E7%A4%BA%E6%B3%95)国际标准，同时还包括其他的非标准的日历系统。支持时区、持续时间、格式化和解析功能。

在java 8之前可以依赖joda time三方库，使用其日期时间库。

但在java 8中提出了[JSR 310](https://jcp.org/aboutJava/communityprocess/pfd/jsr310/JSR-310-guide.html): Date and Time API规范，该规范即新版的日期时间库`java.time`规约。可以说JSR-310的设计上汲取了大量的joda time的特性。新版本的日期时间库基于JSR 310: Date and Time API开发，`java.time`是基于国际化标准日历系统（International Organization for Standardization）ISO_8601，同时`java.time.chrono`支持对全球日历系统的扩展。

JSR-310中设计的`java.time`包括年、月、星期、日期时间、持续时间段、瞬时、时钟、时区的抽象及处理。且api的设计上使用易读易于理解的名称和设计模式，让使用者欣然接受。而且提供旧版和新版api之间的互通以处理兼容性问题。

下面看张概览图，从宏观角度了解下`java.time`

![img](/img/java8-time.png)

- 第一层是对年、月、月中日、星期的抽象；
- 第二层是对日期、日期时间、时区的抽象，其中时区分为时区Id（Europe/Paris）和时区偏移量(Z/+hh:mm/-hh:mm)；
- 第三层是对区域时间和便宜时间的抽象；
- 第四层是对瞬时和时钟的抽象；
- 第五层是对时序时段和持续周期的抽象
- 右侧层是辅助工具类，如：日期时间格式、日期时间调整器、其他的日历系统；

java 8中日期时间库共分为五个package：

- `java.time`：基于ISO_8601日历系统实现的日期时间库
- `java.time.chrono`：全球日历系统扩展库，可以自行扩展
- `java.time.format`：日期时间格式，包含大量预定义的格式，可以自行扩展
- `java.time.zone`：时区信息库
- `java.time.temporal`：日期时间调整辅助库

关于日期时间库的使用详细过程，推荐查看oracle提供的java教程[The Java™ Tutorials——Trail: Date Time](https://docs.oracle.com/javase/tutorial/datetime/index.html)

# 3  java.time优点

## 3.1 设计

`java.time`中使用了大量的设计模式：

- **工厂模式**：`now()`工厂方法直接生成当前日期时间或者瞬时；`of()`工厂方法根据年月日时分秒生成日期或者日期时间；
- **装饰模式**：时区时间`ZoneDateTime`/偏移时间`OffsetDateTime`，都是在`LocalDateTime`的基础上加上时区/偏移量的修饰成为时区时间，然后可以进行时区转换；
- **建造者模式**：`Calendar`中加入建造者类，用于生成新的`Calendar`对象；

## 3.2 命名

java 8中的日期时间库类名、方法名命名上都是极其形象生动，易于理解，让开发者极易于使用——语义清晰精确！如：LocalDate中提供的now表示现在的日期，of用于年月日组成的日期（这里和英文中的of意义非常贴切），plus/minus加减等等；

## 3.3 合理的接口设计

- `LocalDate`表示日期，由年月日组成，提供了获取所在年，所在月，所在日的api，提供所在一年的第几天api，用于比较日期前后api，替换年份、月份、日的api，这些api使得日期或者日期时间的处理上得到的功能上的极大提升；
- 抽象出年、月、日、星期、日期、日期时间、瞬时、周期诸多接口，对事物本质有了细腻的抽象，并提供了相互转换的能力——提供极强的处理能力和语言表达能力；
- 对于遗留的日期时间库`Calendar/Date/Timezone`和新的日期时间库的互通性；
- 将全球的非标准日历系统单独抽象并支持扩展，从标准日历系统中隔离（符合设计原则：对修改关闭，对扩展开放）

# 4 java.time使用示例

得益于新日期时间框架的设计，无论是类名还是方法名以及可读性，都相当容易理解，其上手成本比Date/Calendar要低得多。

并且，LocalDateTime/LocalDate之间，以及它们和jdk 1.8之前的Date也可以互相转换。

以下是一个使用示例：

```java
public class Intro {
    static String yyyy = "yyyy";
    static String yyyy_MM = "yyy-MM";
    static String yyyy_MM_dd = "yyyy-MM-dd";
    static String yyyy_MM_dd_HH_mm_ss = "yyyy-MM-dd HH:mm:ss";
    static String yyyy_MM_dd_HH_mm_ss_SSS = "yyyy-MM-dd HH:mm:ss.SSS";

    /**
     * If the pattern like 'yyyy', result {@link LocalDateTime} could be like 'yyyy-01-01 00:00:00'.<br>
     * If the pattern like 'yyyy-MM', result {@link LocalDateTime} could be like 'yyyy-MM-01 00:00:00'.<br>
     * If the pattern like 'yyyy-MM-dd', result {@link LocalDateTime} could be like 'yyyy-MM-dd 00:00:00'.<br>
     * Other patterns acts the same.
     * <p>
     *
     * <b>Important:</b> the pattern and the the {@link LocalDateTime#parse(CharSequence, DateTimeFormatter)} method's input {@link CharSequence} must match.
     * e.g. The following method call will throw {@link java.time.format.DateTimeParseException}:
     * <pre>
     *      LocalDateTime localDateTime = LocalDateTime.parse("2021",dtfBuilder("yyyy-MM"));
     * </pre>
     *
     * @param pattern the string pattern
     * @see DateTimeFormatter javadoc
     * @see LocalDateTime#parse(CharSequence, DateTimeFormatter)
     */
    static DateTimeFormatter dtfBuilder(String pattern) {
        return new DateTimeFormatterBuilder()
                .appendPattern(pattern)
                .parseDefaulting(ChronoField.YEAR_OF_ERA, LocalDateTime.now().getYear())
                .parseDefaulting(ChronoField.MONTH_OF_YEAR, 1)
                .parseDefaulting(ChronoField.DAY_OF_MONTH, 1)
                .parseDefaulting(ChronoField.HOUR_OF_DAY, 0)
                .parseDefaulting(ChronoField.MINUTE_OF_HOUR, 0)
                .parseDefaulting(ChronoField.SECOND_OF_MINUTE, 0)
                .parseDefaulting(ChronoField.NANO_OF_SECOND, 0)
                .toFormatter();
    }

    static SimpleDateFormat sdfBuilder(String pattern) {
        return new SimpleDateFormat(pattern);
    }

    /**
     * solution1:
     * Get yyyy-MM-dd 00:00:00, start of the day.<br>
     * If you use yyyy-MM-dd as parameter
     */
    static Date getStartOfDay() {
        LocalDateTime localDateTime = LocalDateTime.parse("2021-02-02",
                dtfBuilder(yyyy_MM_dd));
        Instant instant = localDateTime.atZone(ZoneId.systemDefault()).toInstant();
        return Date.from(instant);
    }

    /**
     * solution2:
     * get yyyy-MM-dd 00:00:00, start of the day.<br>
     * If you use yyyy-MM-dd as parameter<br>
     * <p>
     * Using {@link LocalDate#atStartOfDay()}
     *
     * @param dateString datePattern like 2012-09-08
     */
    static Date getStartOfDay(String dateString) throws ParseException {
        //由于dtfBuilder的设置 这里的时间已经是 00:00:00
        LocalDate localDate = LocalDate.parse(dateString, dtfBuilder(yyyy_MM_dd));
        ZonedDateTime zonedDateTime = localDate.atStartOfDay(ZoneId.systemDefault());
        return Date.from(zonedDateTime.toInstant());
//        return sdfBuilder().parse(zonedDateTime.format(dtfBuilder(yyyy_MM_dd_HH_mm_ss)));
    }

    /**
     *
     */
    static Date getStartOfDay(LocalDate localDate){
        ZonedDateTime zonedDateTime = localDate.atStartOfDay(ZoneId.systemDefault());

        LocalDateTime localDateTime = localDate.atStartOfDay();
        Instant instant = localDateTime.toInstant(ZoneOffset.of("+8"));
//        return Date.from(zonedDateTime.toInstant());
        return Date.from(instant);
    }

    /**
     * Get yyyy-MM-dd 23:59:59.999, end of the day.<br>
     * By using {@link LocalDateTime#plus(long, TemporalUnit)}
     */
    static Date getEndOfDay() {
        //由于dtfBuilder的设置 这里的时间已经是 00:00:00
        LocalDateTime localDateTime = LocalDateTime.parse("2020-12-21", dtfBuilder(yyyy_MM_dd));

        //plusXxx()方法没有提供毫秒/微秒的相应方法，直接到纳秒； 相应的，可以使用plus方法指定单位
        localDateTime = localDateTime.plusHours(23).plusMinutes(59).plusSeconds(59).plusNanos(999_999_999);

        /*
         *  好方法，将其下级单位的值清零
         *  ChronoUnit.DAYS: 清零hh:mm:ss.SSS
         *  最大单位 DAYS，也就是说此方法只能用来清零时间
         */
        localDateTime = localDateTime.truncatedTo(ChronoUnit.DAYS);
        localDateTime = localDateTime
                .plus(23, ChronoUnit.HOURS)
                .plus(59, ChronoUnit.MINUTES)
                .plus(59, ChronoUnit.SECONDS)
                .plus(999, ChronoUnit.MILLIS);
        return Date.from(localDateTime.atZone(ZoneId.systemDefault()).toInstant());
    }

    /**
     * Get yyyy-MM-dd 23:59:59.999, end of the day.<br>
     * By using {@link LocalDate#atTime(LocalTime)}
     *
     * @param dateString date pattern like '2012-09-18'
     */
    static Date getEndOfDay(String dateString) {
        LocalDate localDate = LocalDate.parse(dateString, dtfBuilder(yyyy_MM_dd));
//        localDate.
        LocalDateTime localDateTime = localDate.atTime(23, 59, 59, 999_999_999);
        return Date.from(localDateTime.atZone(ZoneId.systemDefault()).toInstant());

    }

    /**
     * Get first day of month
     *
     * @param dateString pattern like '2020-10-25'
     * @return
     */
    static Date getFirstDayOfMonth(String dateString) {
        LocalDateTime localDateTime = LocalDateTime.parse(dateString, dtfBuilder(yyyy_MM_dd));
        localDateTime = localDateTime.withDayOfMonth(1);
        return Date.from(localDateTime.atZone(ZoneId.systemDefault()).toInstant());
    }

    /**
     * Get the first day of year.
     *
     * @param yearString pattern like '2012'
     */
    static Date getFirstDayOfYear(String yearString) {
        LocalDateTime localDateTime = LocalDateTime.parse(yearString, dtfBuilder(yyyy));
        return Date.from(localDateTime.atZone(ZoneId.systemDefault()).toInstant());
    }


    public static void main(String[] args) throws ParseException {
        System.out.println(sdfBuilder(yyyy_MM_dd_HH_mm_ss).format(getStartOfDay()));
        System.out.println(sdfBuilder(yyyy_MM_dd_HH_mm_ss).format(getStartOfDay("2021-02-02")));
        System.out.println(sdfBuilder(yyyy_MM_dd_HH_mm_ss_SSS).format(getStartOfDay(LocalDate.parse("2021-02-22", dtfBuilder(yyyy_MM_dd)))));
        System.out.println(sdfBuilder(yyyy_MM_dd_HH_mm_ss_SSS).format(getEndOfDay()));
        System.out.println(sdfBuilder(yyyy_MM_dd_HH_mm_ss_SSS).format(getEndOfDay("2020-12-21")));
        System.out.println(sdfBuilder(yyyy_MM_dd).format(getFirstDayOfMonth("2020-12-18")));
        System.out.println(sdfBuilder(yyyy_MM_dd_HH_mm_ss).format(getFirstDayOfYear("2012")));
    }
}
```

源码地址：https://github.com/wangy325/java-review/blob/master/src/main/java/com/wangy/common/time/Intro.java

# 5 补充内容

## 5.1 时区

时区是地球上的区域使用同一个时间定义。以前，人们通过观察太阳的位置（时角）决定时间，这就使得不同经度的地方的时间有所不同（地方时）。1863年，首次使用时区的概念。时区通过设立一个区域的标准时间部分地解决了这个问题。

世界各个国家位于地球不同位置上，因此不同国家，特别是东西跨度大的国家日出、日落时间必定有所偏差。这些偏差就是所谓的时差。

理论时区以被15整除的子午线为中心，向东西两侧延伸7.5度，即每15°划分一个时区，这是**理论时区**。理论时区的时间采用其中央经线（或标准经线）的地方时。所以每差一个时区，区时相差一个小时，相差多少个时区，就相差多少个小时。东边的时区时间比西边的时区时间早。为了避免日期的紊乱，提出**国际日期变更线**的概念

但是，为了避开国界线，有的时区的形状并不规则，而且比较大的国家以国家内部行政分界线为时区界线，这是**实际时区**，即法定时区。请参见[时区列表](https://zh.wikipedia.org/wiki/%E6%97%B6%E5%8C%BA%E5%88%97%E8%A1%A8#UTC%EF%BC%88WET_-%E6%AD%90%E6%B4%B2%E8%A5%BF%E9%83%A8%E6%99%82%E5%8D%80%EF%BC%8CGMT-_%E6%A0%BC%E6%9E%97%E5%A8%81%E6%B2%BB%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4%EF%BC%89)。

## 5.2 子午线

即**经线**，和纬线一样是人类为度量而假设出来的辅助线，定义为地球表面连接南北两极的大圆线上的半圆弧。任两根经线的长度相等，相交于南北两极点。每一根经线都有其相对应的数值，称为经度。经线指示南北方向。

## 5.3 本初子午线

即**0度经线**，亦称格林尼治子午线或本初经线，是经过英国格林尼治天文台的一条经线（亦称子午线）。本初子午线的东西两边分别定为东经和西经，于180度相遇。

## 5.4 国际标准ISO 8601

[国际标准ISO 8601](https://zh.wikipedia.org/wiki/ISO_8601)：是国际标准化组织的日期和时间的表示方法，全称为《数据存储和交换形式·信息交换·日期和时间的表示方法》。目前是2004年12月1日发行的第三版“ISO8601:2004”以替代1998年的第一版“ISO8601:1988”与2000年的第二版“ISO8601:2000”。

年由4位数字组成YYYY，或者带正负号的四或五位数字表示±YYYYY。以公历公元1年为0001年，以公元前1年为0000年，公元前2年为-0001年，其他以此类推。应用其他纪年法要换算成公历，但如果发送和接受信息的双方有共同一致同意的其他纪年法，可以自行应用。

## 5.5 协调世界时

> 英语：Coordinated Universal Time，
>
> 法语：Temps Universel Coordonné，简称UTC

是最主要的世界时间标准，其以原子时秒长为基础，在时刻上尽量接近于格林尼治标准时间。中华民国采用CNS 7648的《资料元及交换格式–资讯交换–日期及时间的表示法》（与ISO 8601类似）称之为世界协调时间。中华人民共和国采用ISO 8601:2000的国家标准GB/T 7408-2005《数据元和交换格式 信息交换 日期和时间表示法》中亦称之为协调世界时。

协调世界时是世界上调节时钟和时间的主要时间标准，它与0度经线的平太阳时相差不超过1秒，并不遵守夏令时。协调世界时是最接近格林威治标准时间（GMT）的几个替代时间系统之一。对于大多数用途来说，UTC时间被认为能与GMT时间互换，但GMT时间已不再被科学界所确定。

如果时间是以协调世界时（UTC）表示，则在时间后面直接加上一个“Z”（不加空格）。“Z”是协调世界时中0时区的标志。因此，“09:30 UTC”就写作“09:30Z”或是“0930Z”。“14:45:15 UTC”则为“14:45:15Z”或“144515Z”。

## 5.6 UTC偏移量

UTC偏移量用以下形式表示：±[hh]:[mm]、±[hh][mm]、或者±[hh]。如果所在区时比协调世界时早1个小时（例如柏林冬季时间），那么时区标识应为“+01:00”、“+0100”或者直接写作“+01”。这也同上面的“Z”一样直接加在时间后面。
"UTC+8"表示当协调世界时（UTC）时间为凌晨2点的时候，当地的时间为2+8点，即早上10点。

## 5.7 格林尼治平时

>英语：Greenwich Mean Time，GMT）

是指位于英国伦敦郊区的皇家格林尼治天文台当地的平太阳时，因为本初子午线被定义为通过那里的经线。

自1924年2月5日开始，格林尼治天文台负责每隔一小时向全世界发放调时信息。

格林尼治平时的正午是指当平太阳横穿格林尼治子午线时（也就是在格林尼治上空最高点时）的时间。由于地球每天的自转是有些不规则的，而且正在缓慢减速，因此格林尼治平时基于天文观测本身的缺陷，已经被原子钟报时的协调世界时（UTC）所取代。

# 6 参考

- [Java8日期和时间工具库](https://www.cnblogs.com/lxyit/p/9442135.html)
- [Is-java-util-calendar-thread-safe-or-no](https://www.stackoverflow.com/questions/12131324/is-java-util-calendar-thread-safe-or-not)
- [Java8的java.time包](https://www.jianshu.com/p/19bd58b30660)
- [Simp code demo of package java.time](https://www.github.com/wangy325/java-review/blob/master/src/main/java/com/wangy/common/time/Intro.java)
- [Unable-to-obtain-localdatetime-from-temporalaccessor-when-parsing-localdatetime](https://www.stackoverflow.com/questions/27454025/unable-to-obtain-localdatetime-from-temporalaccessor-when-parsing-localdatetime)
- [JSR 310 guide](https://www.jcp.org/aboutJava/communityprocess/pfd/jsr310/JSR-310-guide.html)
- [Wiki: timezone/时区](https://www.zh.wikipedia.org/wiki/%E6%97%B6%E5%8C%BA)
- [Wiki: list of timezone](https://www.zh.wikipedia.org/wiki/%E6%97%B6%E5%8C%BA%E5%88%97%E8%A1%A8#UTC%EF%BC%88WET_-%E6%AD%90%E6%B4%B2%E8%A5%BF%E9%83%A8%E6%99%82%E5%8D%80%EF%BC%8CGMT-_%E6%A0%BC%E6%9E%97%E5%A8%81%E6%B2%BB%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4%EF%BC%89)
- [经线](https://www.zh.wikipedia.org/wiki/%E7%BB%8F%E7%BA%BF)
- [ISO 8601](https://www.zh.wikipedia.org/wiki/ISO_8601)
- [UTC](https://www.zh.wikipedia.org/wiki/%E5%8D%8F%E8%B0%83%E4%B8%96%E7%95%8C%E6%97%B6)
- [GMT](https://www.zh.wikipedia.org/wiki/%E6%A0%BC%E6%9E%97%E5%B0%BC%E6%B2%BB%E6%A8%99%E6%BA%96%E6%99%82%E9%96%93)
