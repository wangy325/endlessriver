---
title: "使用Logback记录日志"
date: 2021-02-10
categories: [java]
tags: [translation]
image:
---

[Logback](https://logback.qos.ch/)是Java应用中使用最广的日志框架之一，它是[其前辈框架Log4j的替代者](https://logback.qos.ch/reasonsToSwitch.html)。相比Log4j，Logback在日志处理速度、配置多样性、对旧日志文件的处理灵活性上均要优于Log4j。

这篇文章将介绍Logback的主要组成结构并指导你使用Logback构建更好的程序。

<!--more-->

## 1 Logback的组成结构

Logback的主要组成结构有3部分：**Logger**、**Appender**、**Layout**。

*Logger*指示日志信息的上下文背景（context）。Java应用会根据Logger去记录日志文件。

*Appender*将日志文件保存到指定的位置。一个*Logger*可以配置多个Appender。我们一般认为**Appender的功能就是将日志写成文本文件里**，但是Logback能做的可不止这些。

*Layout*决定日志的格式化信息。Logback的日志格式信息配置非常丰富，此外，Logback还支持自定义日志格式信息。

## 2 配置Logback

### 2.1 引入Maven依赖

Logback使用SLF4j（Simple Logging Facade for Java）作为其原生接口。在开始之前，我们需要在pom.xml引入Logback和Slf4j的依赖。

> 可能你的项目中已经引入了这两个依赖，因为spring/其他第三方jar很可能就使用Logback记录日志。

```xml
<dependency>
    <groupId>ch.qos.logback</groupId>
    <artifactId>logback-core</artifactId>
    <version>1.2.3</version>
</dependency>

<dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-api</artifactId>
    <version>1.7.30</version>
    <scope>test</scope>
</dependency>
```

在Maven中央仓库中很容易找到这最新依赖：

- [logback-core：](https://search.maven.org/classic/#search%7Cgav%7C1%7Cg%3A%22ch.qos.logback%22%20AND%20a%3A%22logback-core%22)
- [slf4j-api：](https://search.maven.org/classic/#search%7Cgav%7C1%7Cg%3A%22org.slf4j%22%20AND%20a%3A%22slf4j-api%22)


### 2.2 类路径

除了上述的`logback-core`和`slf4j`之外，Logback运行时还还需要在类路径中依赖`logback-classic.jar`

```xml
<dependency>
    <groupId>ch.qos.logback</groupId>
    <artifactId>logback-classic</artifactId>
    <version>1.2.3</version>
</dependency>
```

## 3 基础配置示例

我们先从一个`快速开始`<span id="c4">开始吧</span>。

首先，我们需要一个配置文件。创建一个配置文件`logback.xml`并将其放在classpath resource中，并在配置文件中作如下简单配置：

```xml
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
    </encoder>
  </appender>

  <root level="debug">
    <appender-ref ref="STDOUT" />
  </root>
</configuration>
```

接下来，我们写一个简单的测试类：

```java
public class Example {

    private static final Logger logger
      = LoggerFactory.getLogger(Example.class);

    public static void main(String[] args) {
        logger.info("Example log from {}", Example.class.getSimpleName());
    }
}
```

类`Example`创建了一个`Logger`，并且在main方法中调用了`info()`方法，以此来生成日志。

当运行`Example`时，可以在控制台看到日志信息：

```log
20:34:22.136 [main] INFO Example - Example log from Example
```

你看，不到几分钟，Logback的使用就搞定了，知道Logback为什么这么流行了吧（笑）。

别高兴，我们还是回头看看`log.xml`这个配置文件干了些啥吧：

1. 我们定义了一个Appender：**STDOUT**，引用的类是**ConsoleAppender**。
2. 我们定义了日志信息输出格式模版。
3. `Examlple`类创建了一个`Logger`，我们通过`info()`方法将日志信息传递给它处理。

## 4 Logger上下文

### 4.1 创建Logger

为了使用Logback记录日志，首先使用SLF4J创建一个Logger实例：

```java
private static final Logger logger
  = LoggerFactory.getLogger(Example.class);
  ```

随即我们就可以这样使用它：

```java
logger.info("Example log from {}", Example.class.getSimpleName());
```

上例中我们创建的Logger就是日志上下文。通过传递当前类对象给`LoggerFactory`的静态方法`getLogger(Example.class)`，即可获得当前类的日志上下文对象`logger`。当然，除了使用class作为参数之外，还可以使用**字符串**作为参数。

日志上下文有等级（继承）关系，这点和Java的对象的继承关系很像：

1. 当一个Logger的名字后面跟随有点(.)时，其是一个祖Logger，点和其后的名字组成了子Logger。
2. 当一个Logger没有既没有父Logger也没有Logger时，它自己就是一个就是一个父Logger。

例如在包`com.baeldung.logback`包中有一个类`Example`，其子包`com.baeldung.logback.appenders`中，有一个类`ExampleAppender`，那么`ExampleAppender`的Logger就是`Example`的子Logger。

**所有的Logger都是系统预定义的root Logger的子Logger**。

`Logger`拥有日志级别`level`，日志级别可以通过配置文件配置，也可以通过代码`Logger.setLevel`配置。在代码中的配置会**覆盖**配置文件中的配置。

一般来说，日志级别按照优先级从低到高依次为：`TRACE`，`DEBUG`，`INFO`，`WARN`和`ERROR`。每个级别都有对应的处理日志的方法。

**如果一个Logger没有显式地配置日志级别，它从其最近的父Logger中继承日志级别**。root Logger的默认级别是`DEBUG`。下文将展示如何配置并使用日志上下文。

### 4.2 如何使用日志上下文

下面的示例展示了日志上下文的等级关系：

```java
ch.qos.logback.classic.Logger parentLogger =
  (ch.qos.logback.classic.Logger) LoggerFactory.getLogger("com.baeldung.logback");

parentLogger.setLevel(Level.INFO);

Logger childlogger =
  (ch.qos.logback.classic.Logger)LoggerFactory.getLogger("com.baeldung.logback.tests");

parentLogger.warn("This message is logged because WARN > INFO.");
parentLogger.debug("This message is not logged because DEBUG < INFO.");
childlogger.info("INFO == INFO");
childlogger.debug("DEBUG < INFO");
```

运行程序，我们看到如下输出：

```log
20:31:29.586 [main] WARN com.baeldung.logback - This message is logged because WARN > INFO.
20:31:29.594 [main] INFO com.baeldung.logback.tests - INFO == INFO
```

首先我们创建一个名为`com.baeldung.logback`的parentLogger，并将其类型转换为`ch.qos.logback.classic.Logger`。

日志上下文创建之后就要设置其日志级别，由于SLF4j的抽象Logger没有实现`setLevel()`方法，这也是我们在创建时候进行**类型转换**的原因。

将日志上下文的日志级别设置为`INFO`，接下来创建一个名为`com.baeldung.logback.tests`的childLogger，由上面的表述可知，这个Logger是名为`com.baeldung.logback`的子Logger。

每个Logger上下文都输出2个日志信息，Logback过滤了DEBUG日志，打印了WARN和INFO级别的日志。

接下来，我们看看**root logger**的行为：


```java
ch.qos.logback.classic.Logger logger =
  (ch.qos.logback.classic.Logger)LoggerFactory.getLogger("com.baeldung.logback");
logger.debug("Hi there!");

Logger rootLogger =
  (ch.qos.logback.classic.Logger)LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
logger.debug("This message is logged because DEBUG == DEBUG.");

rootLogger.setLevel(Level.ERROR);

logger.warn("This message is not logged because WARN < ERROR.");
logger.error("This is logged.");
```

运行程序，我们看到如下输出：

```log
20:44:44.241 [main] DEBUG com.baeldung.logback - Hi there!
20:44:44.243 [main] DEBUG com.baeldung.logback - This message is logged because DEBUG == DEBUG.
20:44:44.243 [main] ERROR com.baeldung.logback - This is logged.
```

首先我们使用`com.baeldung.logback`的Logger输出DEBUG日志（其继承自root Logger的日志级别）。

然后，我们通过静态域直接获取root Logger，并且将root Logger的日志级别改为`ERROR`。

最后，我们看到Logback过滤了任何级别低于ERROR的日志。

### 4.3 参数化日志输出

和上述使用的简单示例不同，大多数日志框架在打印日志信息时，都需要进行字符串拼接或者对象序列化操作，，这些操作都需要进行内存分配，和（可能的）垃圾回收操作。

考虑下面的示例：

```java
log.debug("Current count is " + count);
```

这个示例增加了拼接信息的开销——无论这个消息是否被Logback过滤，都需要先进行消息拼接。

Logback通过**参数化消息**提供了一个替代方案：

```java
log.debug("Current count is {}", count);
```

大括号`{}`接收任何对象（Object），并且在确认这个消息会被使用后，才调用其`toString()`方法构建消息。

Logback还支持其他形式的参数输出：

```java
String message = "This is a String";
Integer zero = 0;

try {
    logger.debug("Logging message: {}", message);
    logger.debug("Going to divide {} by {}", 42, zero);
    int result = 42 / zero;
} catch (Exception e) {
    logger.error("Error dividing {} by {} ", 42, zero, e);
}
```

以上片段将输出：

```log
21:32:10.311 [main] DEBUG com.baeldung.logback.LogbackTests - Logging message: This is a String
21:32:10.316 [main] DEBUG com.baeldung.logback.LogbackTests - Going to divide 42 by 0
21:32:10.316 [main] ERROR com.baeldung.logback.LogbackTests - Error dividing 42 by 0
java.lang.ArithmeticException: / by zero
  at com.baeldung.logback.LogbackTests.givenParameters_ValuesLogged(LogbackTests.java:64)
...
```

上面的示例展示了使用字符串，整型（int/Integer）作为日志输出参数。

此外，当向日志方法传递`Exception`实例时，Logback将会打印异常的**堆栈信息**。

## 5 Logback详细配置

在[第4节](#c4)中，Logback仅仅使用了11行的基础配置，即可完成工作。这是Logback的默认行为，如果Logback没有发现配置文件，它将配置一个`ConsoleAppender`并将其和`root logger`关联。

### 5.1 定位配置文件

Logback的配置文件可以放置在classpath中，并且以`logback.xml`或者`logback-test.xml`命名。

Logback发现配置文件的步骤如下：

1. 按序依次在classpath中在查找`logback-test.xml`,`logback.groovy`,`logback.xml`;
2. 若没有发现上述文件，Logback将使用`Java ServiceLoader`加载`com.qos.logback.classic.spi.Configurator`的实现；
3. 配置Logback的控制台日志输出

  > 当前Logback版本不支持Groovy配置。？？


### 5.2 基础配置

我们不妨重新看看第4节中的基础配置：

```xml
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
    </encoder>
  </appender>

  <root level="debug">
    <appender-ref ref="STDOUT" />
  </root>
</configuration>
```

所有Logback配置都置于`<configuration>`标签中。

注意`<appender>`标签，我们将其指定为`ConsoleAppender`，并将其命名为**STDOUT**。其内部有一个`<encoder>`标签，该标签内部定义了`<pattern>`--这是日志的输出格式。

接下来是一个`<root>`标签，这个标签设置root logger的日志级别为`DEBUG`，并且将其输出与appender **STDOUT**相关联。

### 5.3 配置文件定位BUG

Logback的配置文件有时候会相当复杂，因此Logback集成了一些机制来进行问题检测。

如果想查看Logback处理日志时的debug信息，可以开启debug logging:

```xml
<configuration debug="true">
  ...
</configuration>
```

如此做，Logback会在控制台打印加载配置文件时的状态信息：

```log
23:54:23,040 |-INFO in ch.qos.logback.classic.LoggerContext[default] - Found resource [logback-test.xml]
  at [file:/Users/egoebelbecker/ideaProjects/logback-guide/out/test/resources/logback-test.xml]
23:54:23,230 |-INFO in ch.qos.logback.core.joran.action.AppenderAction - About to instantiate appender
  of type [ch.qos.logback.core.ConsoleAppender]
23:54:23,236 |-INFO in ch.qos.logback.core.joran.action.AppenderAction - Naming appender as [STDOUT]
23:54:23,247 |-INFO in ch.qos.logback.core.joran.action.NestedComplexPropertyIA - Assuming default type
  [ch.qos.logback.classic.encoder.PatternLayoutEncoder] for [encoder] property
23:54:23,308 |-INFO in ch.qos.logback.classic.joran.action.RootLoggerAction - Setting level of ROOT logger to DEBUG
23:54:23,309 |-INFO in ch.qos.logback.core.joran.action.AppenderRefAction - Attaching appender named [STDOUT] to Logger[ROOT]
23:54:23,310 |-INFO in ch.qos.logback.classic.joran.action.ConfigurationAction - End of configuration.
23:54:23,313 |-INFO in ch.qos.logback.classic.joran.JoranConfigurator@5afa04c - Registering current configuration
  as safe fallback point
```

若读取配置文件时出现警告或错误信息，Logback会将其状态信息输出到控制台。


除了debug logging之外，还有另一种方式可以打印Logback的状态信息：

```xml
<configuration>
    <statusListener class="ch.qos.logback.core.status.OnConsoleStatusListener" />  
    ...
</configuration>
```

**StatusListener在Logback进行配置和程序运行时拦截状态信息，并将其输出。**

所有配置文件的状态信息都将输出，这样就很容易定位问题。

### 5.4 自动重载配置文件

应用程序运行时自动重新加载配置文件往往能有助于定位程序bug。Logback通过`scan`参数来配置自动加载配置文件：

```xml
<configuration scan="true">
  ...
</configuration>
```

默认情况下，Logback每60s扫描一次配置文件，通过`scanPeriod`参数改变这一配置：

```xml
<configuration scan="true" scanPeriod="15 seconds">
  ...
</configuration>
```

注意scanPeriod的赋值，其带有一个指示时间单位的字符串，其值可以是 milliseconds，seconds， minutes和hours。

### 5.5 配置Loggers

在之前的简单配置中，我们配置了root logger的日志级别，并将其与STDOUT（console Appender）相关联。

实际上，我们可以设置任意多个logger:

```xml
<configuration>
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    <logger name="com.baeldung.logback" level="INFO" />
    <logger name="com.baeldung.logback.tests" level="WARN" />
    <root level="debug">
        <appender-ref ref="STDOUT" />
    </root>
</configuration>
```

使用如下代码片段测试此配置：

```java
Logger foobar =
  (ch.qos.logback.classic.Logger) LoggerFactory.getLogger("com.baeldung.foobar");
Logger logger =
  (ch.qos.logback.classic.Logger) LoggerFactory.getLogger("com.baeldung.logback");
Logger testslogger =
  (ch.qos.logback.classic.Logger) LoggerFactory.getLogger("com.baeldung.logback.tests");

foobar.debug("This is logged from foobar");
logger.debug("This is not logged from logger");
logger.info("This is logged from logger");
testslogger.info("This is not logged from tests");
testslogger.warn("This is logged from tests");
```

输出的结果很容易预测，如果你没有猜中，那么有必要回头看看第5节Logger相关的内容。

此测试的输出为：

```log
00:29:51.787 [main] DEBUG com.baeldung.foobar - This is logged from foobar
00:29:51.789 [main] INFO com.baeldung.logback - This is logged from logger
00:29:51.789 [main] WARN com.baeldung.logback.tests - This is logged from tests
```

若没有显式地配置logger，就像上例中的`foobar`一样，配置文件会自动配置它们，com.baeldung.foobar实际上继承了root logger的`DEBUG`日志级别。

loggers还可以从root logger继承appender-ref，我们在接下来的配置中能够看到这点。


### 5.6 定义属性变量

Logback的配置文件支持配置变量，变量可以配置在`<configuration>`标签内的的任何地方。

下例配置FileAppender时用到了变量：

```xml
<property name="LOG_DIR" value="/var/log/application" />
<appender name="FILE" class="ch.qos.logback.core.FileAppender">
    <file>${LOG_DIR}/tests.log</file>
    <append>true</append>
    <encoder>
        <pattern>%-4relative [%thread] %-5level %logger{35} - %msg%n</pattern>
    </encoder>
</appender>
```

在配置appender之前，我们定义了一个属性变量`LOG_DIR`，接下来，在配置appender的文件地址时用到了这个变量。

变量除了配置在`<property>`标签内部，还可以从外部源中获取--例如从系统属性（system properties）中。如果忽略上面示例中的`<property>`标签配置，我们还可以这样使用它：

```shell
$ java -DLOG_DIR=/var/log/application com.baeldung.logback.LogbackTests
```

通过系统属性指定变量键值对，在Logback配置文件中通过`${propertyName}`的方式即可获取变量的值。


## 6 Appenders

loggers传递日志事件（logging events）给appenders。日志输出（记录）工作实际上是由appender完成的。通常我们认为“日志”就是在控制台或者日志文件中呈现一些内容，但是Logback能做的更多。Logback-core提供了几个有用的appender。

### 6.1 控制台日志

此文到这里，ConsoleAppender相信你已经不再陌生了。ConsoleAppender主要用来向`System.out`或`System.err`追加信息。

它使用`OutputStreamWriter`来缓冲I/O[^so directing it to System.err does not result in unbuffered writing]。

### 6.2 文件日志

FileAppender将日志信息追加到系统文件。它的配置相对复杂，让我们先试试在之前的配置文件中增加一个FileAppender配置：

```xml
<configuration debug="true">
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <!-- encoders are assigned the type
             ch.qos.logback.classic.encoder.PatternLayoutEncoder by default -->
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <appender name="FILE" class="ch.qos.logback.core.FileAppender">
        <file>tests.log</file>
        <append>true</append>
        <encoder>
            <pattern>%-4relative [%thread] %-5level %logger{35} - %msg%n</pattern>
        </encoder>
    </appender>

    <logger name="com.baeldung.logback" level="INFO" />
    <logger name="com.baeldung.logback.tests" level="WARN">
        <appender-ref ref="FILE" />
    </logger>

    <root level="debug">
        <appender-ref ref="STDOUT" />
    </root>
</configuration>
```

FilesAppender通过`<file>`标签来配置日志文件地址。

`<append>`标签配置布尔值true，意味着追加日志信息到文件，而不是抹掉之前的信息。若我们多次运行，会发现日志文件记录了所有的运行日志。

注意logger `com.baeldung.logback.tests`的配置：上例中将其日志级别设置为`WARN`，并且将其和`FILE` appender关联，这意味着此logger WARN级别以上的日志将会在日志文件test.log中记录。**同时**，由于其本身继承自root logger，所以控制台会输出其DEBUG级别的日志，如此，便记录了重复的日志。

Logback可以改变子logger的行为，使其和root logger独立工作：

```xml
<logger name="com.baeldung.logback.tests" level="WARN" additivity="false" >
    <appender-ref ref="FILE" />
</logger>

<root level="debug">
    <appender-ref ref="STDOUT" />
</root>
```

通过将`additivity`属性设置为false，可以改变logger的默认行为，logger `com.baeldung.logback.tests`及其导出logger的日志将不再显示在控制台。


### 6.3 滚动文件日志

多数时候，将日志文件记录到一个文件中并不是我们期待的（可能会记录一个达几个G的文本文件）。我们常希望日志文件能够基于日期、文件大小、或二者联合配置来“滚动”记录。

因此，Logback提供了RollingFileAppender：

```xml
<property name="LOG_FILE" value="LogFile" />
<appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <file>${LOG_FILE}.log</file>
    <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
        <!-- daily rollover -->
        <fileNamePattern>${LOG_FILE}.%d{yyyy-MM-dd}.gz</fileNamePattern>

        <!-- keep 30 days' worth of history capped at 3GB total size -->
        <maxHistory>30</maxHistory>
        <totalSizeCap>3GB</totalSizeCap>
    </rollingPolicy>
    <encoder>
        <pattern>%-4relative [%thread] %-5level %logger{35} - %msg%n</pattern>
    </encoder>
</appender>
```

RollingFileAppender需要配置滚动策略（rolling policy），上面的示例配置中，我们配置了`TimeBasedRollingPolicy`。

和FileAppender类似，RollingFileAppender首先需要配置文件名，上例使用了占位符变量填充的方式配置文件名，这种方式前文已经说过了。

让我看看`<rollingPolicy>`标签的配置，`<fileNamePattern>`的配置值不仅仅定义了日志文件的名字，还定义了其滚动策略。`TimeBasedRollingPolicy`检查fileNamePattern并且按照友好的方式滚动日志文件。

例如：

```xml
<property name="LOG_FILE" value="LogFile" />
<property name="LOG_DIR" value="/var/logs/application" />
<appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <file>${LOG_DIR}/${LOG_FILE}.log</file>
    <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
        <fileNamePattern>${LOG_DIR}/%d{yyyy/MM}/${LOG_FILE}.gz</fileNamePattern>
        <totalSizeCap>3GB</totalSizeCap>
    </rollingPolicy>
...
```

上述配置中，当前活动的配置文件是`/var/logs/application/LogFile`，这个文件在每月开始即滚动至
`/Current Year/Current Month/LogFile.gz`，之后，RollingFileAppender会再创建一个新的活动日志文件LogFile。

当所有日志文件大小达到3GB之后，RollingFileAppender会删除最早的日志文件。

滚动周期的设置很灵活，可以是月，周，日，时，分，秒，甚至毫秒。

RollingFileAppender还支持日志文件压缩，上例中，由于使用了`.gz`的文件后缀，滚动日志文件将被压缩。

需要说明的是，TimeBasedRollingPolicy并不是滚动日志的唯一选择，Logback同时还提供了`SizeAndTimeBasedRollingPolicy`，它能够同时根据当前日志文件大小和时间来决定日志的滚动策略。此外，Logback还提供`FixedWindowRollingPolicy`，其在每次日志系统启动的时候滚动日志。

此外，Logback还支持自定义日志滚动策略，具体细节可以参考：https://logback.qos.ch/manual/appenders.html#onRollingPolicies

### 6.4 自定义Appender

通过继承Logback的任一基础appender类，就可以自定义我们自己的appender了，[这里](https://www.baeldung.com/custom-logback-appender)有一个示例。

## 7 日志输出格式

虽然日志输出格式能够[自定义](https://logback.qos.ch/manual/layouts.html#writingYourOwnLayout)，不过，由于可选参数组合太多，往往花费时间反而得不到想要的效果。实际上，默认的输出格式能够满足大多数应用的需求。

目前示例中使用的输出格式是：

```xml
<encoder>
    <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
</encoder>
```

这段配置脚本配置了`PatternLayoutEncoder`，通过向Appender传递Encoder，Encoder中配置的pattern将会应用到日志输出格式上。

输出模式（PatternLayout）通过大量转换以及格式修饰符来决定日志输出的格式。

我们不妨拆解一下上面的pattern，Logback PatternLayout通过`%`前缀来识别转换符，所以上述配置中的转换符有：

1. %d{HH:mm:ss.SSS}，包含时分秒、毫秒的时间戳；
2. \[%thread\]，使用方括号包括的生成日志的线程名；
3. %-5level，日志级别，padded to 5 characters；
4. %logger{36}，logger名字，压缩至36个字符内；
5. %msg%n，日志信息+系统换行符

如此配置之后，我们可以看到类似这样的日志输出：

```xml
21:32:10.311 [main] DEBUG com.baeldung.logback.LogbackTests - Logging message: This is a String
```

完整的转换以及格式修饰符可以查看[这里](https://logback.qos.ch/manual/layouts.html#conversionWord)的官方文档。


## 8 总结

这篇教程总结了Logback的基础用法。

文章介绍了Logback架构中的3个主要构件：loggers，appenders和layout。Logback配置文件功能丰富强大，通过其可以控制日志的过滤以及格式化规则。此外，本文还介绍了2个经常使用的appender，通过appender配置，Logback可以按照需求进行日志的创建、滚动、组织和压缩。


---

原文地址: https://www.baeldung.com/logback
