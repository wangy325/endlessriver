---
title: "SpringBoot使用AOP的简单示例"
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

有一个cd接口，其实体类用于播放歌曲，同时我们想在播放歌曲的时候记录每个曲目的播放次数。看起来，记录次数这个事和播放曲目是不相干的事情，当然，我们可以在每首歌曲播放完成之后记录，但是更好的办法是使用一个切面，切入到播放方法中，来完成这件事，这样可以减少无关逻辑对代码的侵入。

此程序分别使用了基于@Aspect注解和基于XML配置文件2种方式进行了切面注入，2种方式效果是等同的。

此程序使用的是Spring AOP，并没有使用功能更加丰富的AspectJ，Spring AOP很大部分借鉴了AspectJ，如果只是简单的方法层面的织入，那么Spring AOP就能够满足需求。如果需要构造器或者属性拦截，或者需要为spring bean引入新方法，那么就需要使用AspectJ了。

# 1 开始

从[start.spring.io](https://start.spring.io)下载空项目，引入Spring AOP依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

<!--more-->

# 2 配置

## 2.1 基于JavaBean+注解的配置

### 2.1.1 注入Bean

```java
@Configuration
@Profile("jc")
public class DiskConfig {

    @Bean("jcd")
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
        tracks.add("Missing You");
        tracks.add("Death Valley");
        cd.setTracks(tracks);
        return cd;
    }

    @Bean("jtc")
    public TrackCounter trackCounter() {
        return new TrackCounter();
    }
}
```

### 2.1.2 创建切面

使用注解`@Aspect`可以将一个Bean声明为切面：

```java
@Aspect
@Slf4j
public class TrackCounter {

    private Map<Integer, Integer> trackCounts = new HashMap<>();

    public int getPlayCount(int trackNumber) {
        return trackCounts.getOrDefault(trackNumber, 0);
    }

    @Pointcut("execution( * com.wangy.aop.disk.BlankDisk.playTrack(..)) && args(trackNumber)")
    public void pc1(int trackNumber){
    }

    @Pointcut("execution(* com.wangy.aop.disk.BlankDisk.playTrack(int))")
    public void pc2(){}

    @Before(value = "pc2()")
    public void init(){
        // do something
        log.info("start playing");
    }

    @AfterReturning(value = "pc1(trackNumber)")
    public void countTrack(int trackNumber) {
        log.info("Track {} played", trackNumber);
        trackCounts.put(trackNumber, getPlayCount(trackNumber) + 1);
    }

    @AfterThrowing(value = "pc1(trackNumber)")
    public void skipTrack(int trackNumber) {
        log.info("track {} skipped", trackNumber);
    }

    @After(value = "pc2()")
    public void after(){
        // do something
    }

    @Around(value = "pc1(trackNumber)")
    public void aroundTest(ProceedingJoinPoint jp, int trackNumber) throws Throwable {
        int pl = 2;
        // do some judgement
        if (getPlayCount(trackNumber) > pl) {
            log.info("track {} has been played more than twice, skip this track", trackNumber);
            // change the behavior of pointcut method
            CompactDisk target = (CompactDisk) jp.getTarget();
            target.playTrack(-1);
        }else{
            jp.proceed();
        }
    }
}
```

使用`@Aspect`注解将`TrackCounter` bean声明为一个切面，同时使用`@Pointcut`注解声明切点，再使用对应的通知注解声明通知

- @Before
- @After
- @AfterReturning
- @AfterThrowing
- @Around

若使用xml配置切面，那么`TrackCounter`类看起来和普通的java bean没有差别，稍后会在xml配置文件中将其配置为一个切面

注意上面的切面表达式：

```java
    execution( * com.wangy.aop.disk.BlankDisk.playTrack(int)) && args(trackNumber)
```

前半部分是常见的切面表达式，用于指定切入点；

- 第一个 `*` 指示任意返回类型
- 使用全限定名指定类和方法名，括号内的`int`指定参数列表，可以使用`(..)`来匹配任意参数

更多关于切入点表达式的内容：

- https://www.cnblogs.com/liaojie970/p/7883687.html
- https://howtodoinjava.com/spring-aop/aspectj-pointcut-expressions/
- https://www.baeldung.com/spring-aop-pointcut-tutorial

`&&`连接符后面的内容是什么意思？

这里需要提及的是， Spring AOP支持AspectJ切点指示器的子集，除了**最常用**的`execution()`指示器之外，还有其他的指示器：

|AspectJ指示器|描述|
|:-----|:---|
|args()|限制连接点匹配参数为指定类型的执行方法|
|@args()|限制连接点匹配参数由指定注解标注的执行方法|
|execution()|用于匹配是连接点的执行方法|
|this()|限制连接点匹配AOP代理的bean引用为指定类型的类|
|target|限制连接点匹配目标对象为指定类型的类|
|@target()|限制连接点匹配特定的执行对象，这些对象对应的类需要有指定类型的注解|
|within()|限制连接点匹配指定的类型|
|@within()|限制连接点匹配指定注解所标注的类型（当使用Spring AOP时，方法定义在由指定的注解所标注的类里）|
|@annotation|限制匹配带有指定注解的连接点|

 这里的`arg(trackNumber)`限定符，表明传递给连接点（切入点）`playTrack(int)`的int类型参数也会传递到通知中去。

> 关于`args()`条件的作用，sping官方文档有说明：
https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#aop-ataspectj-advice-params
>
> 需要注意到启动类中使用了`@EnableAspectJAutoProxy`注解，
这意味着开启AspectJ自动代理，使得Spring框架拥有AOP能力：
>
```Java
@SpringBootApplication
@EnableAspectJAutoProxy
public class AopApplication {
    public static void main(String[] args) {
        SpringApplication.run(AopApplication.class, args);
    }
}
```

## 2.2 基于xml文件的配置

xml配置如下[^1]：

```xml
<beans profile="xc">
    <aop:aspectj-autoproxy/>

    <bean id="xtrackCounter" class="com.wangy.aop.TrackCounter" name="xtc"/>

    <bean id="xcd" class="com.wangy.aop.disk.BlankDisk" name="xcd">
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
                <value>Missing You</value>
                <value>Death Valley</value>
            </list>
        </property>
    </bean>

    <aop:config>
        <aop:aspect ref="xtrackCounter">
            <aop:pointcut id="tc"
                          expression="execution(* com.wangy.aop.disk.BlankDisk.playTrack(int)) and args(trackNumber))"/>
            <aop:after-returning pointcut-ref="tc" method="countTrack"/>
            <aop:around method="aroundTest" pointcut-ref="tc"/>
        </aop:aspect>
    </aop:config>
</beans>
```

对应前文中的JavaBean配置中使用的profile，在xml中将所有的配置声明为一个叫'xc'的`profile`。

# 3 测试

测试包中提供了2个测试类，分别用于测试基于`JavaBean+注解`、基于xml文件的aop配置；

- [TrackCounterTest]用于测试基于javaBean和注解实现的aop，这是推荐的方式
- [TrackCountTestWithXml]用于测试基于xml配置的aop，在运行此测试时，需要注释掉[TrackCount](src/main/java/com/wangy/aop/TrackCounter.java)类上的`@Aspect`注解，以免Application Context注入2个切面

以下是使用xml配置的测试样例：

```Java
@SpringBootTest
@SpringJUnitConfig(locations = {"classpath:spring-aop.xml"})
@ActiveProfiles("xc")
public class TrackCountTestWithXml {

    @Autowired
    private CompactDisk cd;

    @Autowired
    private TrackCounter tc;

    @Test
    public void testTc() {
        cd.playTrack(1);
        cd.playTrack(1);
        cd.playTrack(1);

        cd.playTrack(2);

        cd.playTrack(4);
        cd.playTrack(4);

        cd.playTrack(6);
        cd.playTrack(6);
        cd.playTrack(6);
        try {
            cd.playTrack(6);
        } catch (Exception e) {
            //ignore
        }
        assertEquals(3, tc.getPlayCount(1));
        assertEquals(1, tc.getPlayCount(2));
        assertEquals(0, tc.getPlayCount(3));
        assertEquals(2, tc.getPlayCount(4));
        assertEquals(0, tc.getPlayCount(5));
        assertEquals(3, tc.getPlayCount(6));
    }
}
```

# 4 参考

- demo地址：https://github.com/wangy325/simple_springboot_aop_demo

- 切入点表达式使用总结：https://www.cnblogs.com/zhangxufeng/p/9160869.html

[^1]: xml配置并未使用TrackCounter中的全部通知
