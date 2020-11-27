
---
title: "基于Spring Boot的AOP demo"
date: 2020-03-14
draft: false
tags: [aop]
categories: [springboot]
author: "wangy325"

hasJCKLanguage: true

weight: 10
mathjax: true
autoCollapseToc: false
---

有一个cd接口，其实体类用于播放歌曲，同时我们想在播放歌曲的时候记录每个曲目的播放次数。看起来，记录次数这个事和播放曲目是不相干的事情，当然，我们可以在每首歌曲播放完成之后记录，但是
更好的办法是使用一个切面，切入到播放方法中，来完成这件事，这样可以减少无关逻辑对代码的侵入。

此程序分别使用了基于@Aspect注解和基于XML配置文件2种方式进行了切面注入，2种方式效果是等同的。

<!--more-->

此程序使用的是Spring AOP，并没有使用功能更加丰富的AspectJ，Spring AOP很大部分借鉴了AspectJ，如果只是简单的方法层面的织入，那么Spring AOP就能够满足需求。如果需要构造器或者属性拦截，或者需要
为spring bean引入新方法，那么就需要使用AspectJ了

# 开始

从start.spring.io下载空项目，引入Spring AOP依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

# 创建切面

```java
//@Aspect
public class TrackCounter {
    private Map<Integer, Integer> trackCounts = new HashMap<>();

//    @Pointcut("execution( * com.wangy.aop.disk.BlankDisk.playTrack(int)) && args(trackNumber)")
    public void trackPlayed(int trackNumber) {
    }

//    @AfterReturning(value = "trackPlayed(trackNumber)", argNames = "trackNumber")
    public void countTrack(int trackNumber) {
        int currentCount = getPlayCount(trackNumber);
        trackCounts.put(trackNumber, currentCount + 1);
    }

    public int getPlayCount(int trackNumber) {
        return trackCounts.getOrDefault(trackNumber, 0);
    }
}
```

若想避免使用xml配置，可使用`@Aspect`注解将`TrackCounter` bean声明为一个切面，同时使用`@Pointcut`注解声明切点，再使用对应的通知注解声明通知

- @Before
- @After
- @AfterReturning
- @AfterThrowing
- @Round

若使用xml配置切面，那么`TrackCounter`类看起来和普通的java bean没有差别，稍后会在xml配置文件中将其配置为一个切面

注意上面的切面表达式

    execution( * com.wangy.aop.disk.BlankDisk.playTrack(int)) && args(trackNumber)

前半部分是常见的切面表达式，用于指定切入点；`&&`连接符后面的内容是什么意思？

这里需要提及的是， Spring AOP支持AspectJ切点指示器的子集，除了常见的`execution()`指示器之外，还有其他的指示器：

|AspectJ指示器|描述|
|:-----:|:---:|
|arg()|限制连接点匹配参数为指定类型的执行方法|
|@args()|限制连接点匹配参数由指定注解标注的执行方法|
|execution()|用于匹配是连接点的执行方法|
|this()|限制连接点匹配AOP代理的bean引用为指定类型的类|
|target|限制连接点匹配目标对象为指定类型的类|
|@target()|限制连接点匹配特定的执行对象，这些对象对应的类需要有指定类型的注解|
|within()|限制连接点匹配指定的类型|
|@within()|限制连接点匹配指定注解所标注的类型（当使用Spring AOP时，方法定义在由指定的注解所标注的类里）|
|@annotation|限制匹配带有指定注解的连接点|

 这里的`arg(trackNumber)`限定符，表明传递给连接点（切入点）`playTrack(int)`的int类型参数也会传递到通知中去。


# 配置切面

## 基于Java的配置

```java
//@Configuration
//@EnableAspectJAutoProxy
public class TrackConfig {

//    @Bean
    public CompactDisk saveRock() {
        BlankDisk cd = new BlankDisk();
        cd.setArtist("Fall Out Boy");
        cd.setTitle("Save Rock And Roll");
        List<String> tracks = new ArrayList<>();
        tracks.add("The Phoenix");
        tracks.add("My Songs Know What You Did In the Dark (Light Em Up)");
        tracks.add("Alone Together");
        tracks.add("Where Did the Party Go");
        tracks.add("Just One Yesterday (feat. Foxes)");
        tracks.add("The Mighty Fall (feat. Big Sean)");
        tracks.add("Miss Missing You");
        tracks.add("Death Valley");
        cd.setTracks(tracks);
        return cd;
    }

//    @Bean
    public TrackCounter trackCounter() {
        return new TrackCounter();
    }

}
```

这是基于Java的切面配置，将之前的切面装配到Spring容器中，同时初始化了一个cd bean到容器中。

需要注意到的是使用了`@EnableAspectJAutoProxy`注解，这意味着开启AspectJ自动代理，使得Spring框架拥有AOP能力。

## 使用xml配置

xml等效配置全文如下：

```xml
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:aop="http://www.springframework.org/schema/aop"
        xsi:schemaLocation="http://www.springframework.org/schema/aop
                            http://www.springframework.org/schema/aop/spring-aop.xsd
                            http://www.springframework.org/schema/beans
                            http://www.springframework.org/schema/beans/spring-beans.xsd">
    <!-- 开启aspectj自动代理 -->
    <aop:aspectj-autoproxy/>
    <!--  注入bean  -->
    <bean id="trackCounter" class="com.wangy.aop.TrackCounter"/>
    <bean id="cd" class="com.wangy.aop.disk.BlankDisk">
        <property name="title" value="Save Rock And Roll"/>
        <property name="artist" value="Fall Out Boy"/>
        <property name="tracks">
            <list>
                <value>The Phoenix</value>
                <value>My Songs Know What You Did In the Dark (Light Em Up)</value>
                <value>Alone Together</value>
                <value>Where Did the Party Go</value>
                <value>Just One Yesterday (feat. Foxes)</value>
                <value>The Mighty Fall (feat. Big Sean)</value>
                <value>Miss Missing You</value>
                <value>Death Valley</value>
            </list>
        </property>
    </bean>
    <!--  配置切面  -->
    <aop:config>
        <aop:aspect ref="trackCounter">
            <!--  注意此处，表达式的&&操作符换成了英文and，这是由于xml文件会将&解析为其他意义  -->
            <aop:pointcut id="tc" expression="execution(* com.wangy.aop.disk.BlankDisk.playTrack(int)) and args(trackNumber))"/>
            <aop:after-returning pointcut-ref="tc" method="countTrack"/>
        </aop:aspect>
    </aop:config>
</beans>
```

# 测试

```java
@SpringBootTest
// for xml inject only
@ContextConfiguration("classpath:spring-aop.xml")
public class TrackCountTest {

    @Autowired
    private CompactDisk cd;
    @Autowired
    private TrackCounter tc;

    @Test
    public void testTc() {
        cd.playTrack(1);
        cd.playTrack(1);
        cd.playTrack(2);
        cd.playTrack(4);
        cd.playTrack(4);
        cd.playTrack(4);
        cd.playTrack(6);
        cd.playTrack(6);
        cd.playTrack(6);
        cd.playTrack(6);

        assertEquals(2, tc.getPlayCount(1));
        assertEquals(1, tc.getPlayCount(2));
        assertEquals(0, tc.getPlayCount(3));
        assertEquals(3, tc.getPlayCount(4));
        assertEquals(0, tc.getPlayCount(5));
        assertEquals(4, tc.getPlayCount(6));

    }

}
```

# 参考

spring in action (4th edition)

demo地址：https://github.com/wangy325/simple_springboot_aop_demo
