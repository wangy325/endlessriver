---
title: "在SpringBoot中使用MessageSource"
date: 2021-02-20
author: "wangy325"
weight: 2
categories: [java]
tags: [spring, 译文]
---


> <span id="hook">几个说明</span>：
>
> 1. ~~properties配置文件中，`spring.messages.basename`**必须**要加classpath前缀。如 `spring.messages.basename=classpath:i18n/messages`~~；
> 2. ~~必须要手动配置`MessageSource`，springboot不会自动配置之~~；
> 3. 如果使用`MessageSource.getMessage()`方法，第一个参数的引用形式为`"code"`，而不是`"{code}"`或者`"${code}"`。如messageSource.getMessage("test.msg", null, ~~Locale.getDefault()~~)；
> 4. 在配置`LocalValidatorFactoryBean`之后，才可以在`javax.validation.constraints`包下的注解（`@Size`，`@NotNull`...）下的***message***属性中使用`"{code}"`的形式声明校验提示信息。如
> `@NotNull(message = "{leftTime.not.null}")`；
> 5. springMVC的locale配置和JVM的locale配置不一样，在application.properties中配置的`spring.mvc.locale=zh_CN`实际上配置的是`WebMvcProperties`，在获取消息时，locale信息应该使用`webMvcProperties.getLocale()`[^1]获取**而不是**使用`Locale.getDefault()`获取。

---

MessageSource is a powerful feature available in Spring applications. This helps application developers handle various complex scenarios with writing much extra code, such as environment-specific configuration, internationalization or configurable values.

One more scenario could be modifying the default validation messages to more user-friendly/custom messages.

In this tutorial, we'll see how to configure and manage custom validation MessageSource in the application using Spring Boot.

<!--more-->

## 2 引入Maven依赖

Let's start with adding the necessary Maven dependencies:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

You can find the latest versions of these libraries over on Maven Central.

## 3 自定义校验信息示例

Let's consider a scenario where we have to develop an application that supports multiple languages. If the user doesn't provide the correct details as input, we'd like to show error messages according to the user's locale.

Let's take an example of a Login form bean:

```java
public class LoginForm {

    // 注意此处的语法，为"{}"形式，在spring项目中，是无法通过ctrl+鼠标左键定位到配置文件的
    // 若去除大括号，则可以通过ctrl+鼠标左键定位到配置的值
    @NotEmpty(message = "{email.notempty}")
    @Email
    private String email;

    @NotNull
    private String password;

    // standard getter and setters
}
```

Here we've added validation constraints that verify if an email is not provided at all, or provided, but not following the standard email address style.

To show custom and locale-specific message, we can provide a placeholder as mentioned for the `@NotEmpty` annotation.

The `email.notempty`property **will be resolved from a properties files by the MessageSource configuration**.

##  4 配置MessageSource

An application context delegates the message resolution to a bean with the exact name messageSource.

**ReloadableResourceBundleMessageSource** is the most common MessageSource implementation that resolves messages from resource bundles for different locales:

```java
@Bean
public MessageSource messageSource() {
    ReloadableResourceBundleMessageSource messageSource
      = new ReloadableResourceBundleMessageSource();
    // 如果使用ReloadableResourceBundleMessageSource，classpath前缀必不可少
    // classpath前缀告诉ReloadableResourceBundleMessageSource从classpath中获取配置
    messageSource.setBasename("classpath:messages");
    messageSource.setDefaultEncoding("UTF-8");
    return messageSource;
}
```

Here, it's **important to provide the basename** as locale-specific file names will be resolved based on the name provided.

### 4.1 关于MessageSource的自动配置

实际上，Spring Boot可以自动配置MessageSourece，不过，想要成功配置，有2个条件：

1. Spring Boot自动配置实际上使用的是**ResourceBundleMessageSourece**，不同于**ReloadableResourceBundleMessageSource**
2. 你无需再配置别名为"messageSource"的Bean，也就是说上述的配置必须忽略掉

不妨看看MessageSource自动配置相关的类，具体内容在`org.springframework.boot.autoconfig.context.MessageSourceAutoConfiguration.java`类中：

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnMissingBean(name = AbstractApplicationContext.MESSAGE_SOURCE_BEAN_NAME, search = SearchStrategy.CURRENT)
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE)
@Conditional(ResourceBundleCondition.class)
@EnableConfigurationProperties
public class MessageSourceAutoConfiguration {

	//...
}
```

注意该自动配置类上的2个注解：

- `@ConditionalOnMissingBean(name = AbstractApplicationContext.MESSAGE_SOURCE_BEAN_NAME, search = SearchStrategy.CURRENT)`

    这个注解说明的就是，如果你没有配置messageSource，那么SpringBoot（可能）会自动为你配置
- `@Conditional(ResourceBundleCondition.class)`

    这是一个条件化注入，条件在`ResourceBundleCondition.class`中定义。通过名字就知道，Spring Boot自动配置使用的是**ResourceBundleMessageSourece**

`ResourceBundleCondition.class`是`MessageSourceAutoConfiguration.class`的内部类，以下是其内容：

```java
@Override
public ConditionOutcome getMatchOutcome(ConditionContext context, AnnotatedTypeMetadata metadata) {
	String basename = context.getEnvironment().getProperty("spring.messages.basename", "messages");
	ConditionOutcome outcome = cache.get(basename);
	if (outcome == null) {
		outcome = getMatchOutcomeForBasename(context, basename);
		cache.put(basename, outcome);
	}
	return outcome;
}

private ConditionOutcome getMatchOutcomeForBasename(ConditionContext context, String basename) {
	ConditionMessage.Builder message = ConditionMessage.forCondition("ResourceBundle");
	for (String name : StringUtils.commaDelimitedListToStringArray(StringUtils.trimAllWhitespace(basename))) {
		for (Resource resource : getResources(context.getClassLoader(), name)) {
			if (resource.exists()) {
				return ConditionOutcome.match(message.found("bundle").items(resource));
			}
		}
	}
	return ConditionOutcome.noMatch(message.didNotFind("bundle with basename " + basename).atAll());
}

// basename不需要classpath前缀，它总是从classpath中获取资源
private Resource[] getResources(ClassLoader classLoader, String name) {
	String target = name.replace('.', '/');
	try {
		return new PathMatchingResourcePatternResolver(classLoader)
				.getResources("classpath*:" + target + ".properties");
	}
	catch (Exception ex) {
		return NO_RESOURCES;
	}
}
```

我们只需要关注`getResources`方法，可以看到，其自动补全了`classpath`前缀，因此，`ResourceBundleMessageSourece`总是从classpath中获取资源的。

如果这两个条件都满足，那么SpringBoot会自动使用**ResourceBundleMessageSourece**配置MessageSource。

### 4.2 RBMS和RRBMS

- RBMS: **R**esource**B**undle**M**essage**S**ource
- RRBMS: **R**eloadable**R**esource**B**undle**M**essage**S**ource

在本文的[文首](#hook)，标注了几个实践时需要注意的点，现在看来，前2点都是**错误的表述**，因为当时实践时使用的是`ReloadableResourceBundleMessageSourece`，并且没有搞清楚Spring Boot自动配置MessageSource的条件。

关于这2个“MessageSource”的区别，github上有一个经典的[issue](https://github.com/spring-projects/spring-framework/issues/12050)，描述的问题是如果不使用classpath前缀，前者可以读取消息，后者不能读取消息。spring开发人员的回复一针见血：

> I assume your resource bundle files live in the classpath? There is an **important difference** between ResourceBundleMessageSource and ReloadableResourceBundleMessageSource: The former **always loads resource bundles from the classpath** (since that is all that standard java.util.ResourceBundle is capable of),  whereas the latter **loads resource bundle files through the ApplicationContext's ResourceLoader**. If your context is a ClassPathXmlApplicationContext, you won't notice a difference - but if it is a WebApplicationContext, it will try to find the files in the WAR directory structure when not using a prefix. So it would simply not find your files because it is looking in the wrong location.
>
> If my assumption is correct, the following quick fix will allow your messages to be found in their existing location when switching to ReloadableResourceBundleMessageSource:
>
>`<property name="basename" value="classpath:messages">`
>
>However, since classpath resources will be cached by the ClassLoader, ReloadableResourceBundleMessageSource's refreshing is likely to not actually work in that case. So I'd rather recommend specifying something like the following, operating against an expanded WAR directory structure where WEB-INF resources can be refreshed from the file system:
>
>`<property name="basename" value="WEB-INF/messages"/>`

回复指出了ResourceBundleMessageSourece和ReloadableResourceBundleMessageSourece最重要的区别：

- ResourceBundleMessageSourece**总是**从classpath中加载资源
- ReloadableResourceBundleMessageSourece 则从**ApplicationContext's ResourceLoader**中加载资源

除此之外，二者还有一些其他的区别：

- ResourceBundleMessageSourece只能读取properties配置文件，而ReloadableResourceBundleMessageSourece还可以读取xml配置文件
- ReloadableResourceBundleMessageSourece可以从任意位置[^2]读取配置文件
- 从名字来看，Reloadable是可以动态加载配置文件的，事实上也确实如此，它有一个属性`cacheSeconds`，用来设置缓存配置文件的时间间隔：
  - 默认值是 -1，意味着不动态加载配置文件
  - 如果配置值为0，那么每次获取消息时就会检查配置文件的改动，**这个配置值要慎用**
  - 如果配置为其他正整数，则会在固定间隔后检查配置文件改动

## 5 配置LocalValidatorFactoryBean

> 为了在`javax.validation.constraints`包下注解（`@NotEmpty`、`@NotNull`等）的校验中使用messageResource，还需要配置`LocalValidatorFactoryBean`

To use custom name messages in a properties file like we need to define a **LocalValidatorFactoryBean** and register the messageSource:

```java
@Bean
public LocalValidatorFactoryBean getValidator() {
    LocalValidatorFactoryBean bean = new LocalValidatorFactoryBean();
    bean.setValidationMessageSource(messageSource());
    return bean;
}
```

However, note that if we had already **extended the WebMvcConfigurerAdapter**, to avoid having the custom validator ignored, we'd have to set the validator by overriding the getValidator() method from the parent class.

Now we can define a property message like:

    “email.notempty=<Custom_Message>”

instead of

    “javax.validation.constraints.NotEmpty.message=<Custom_message>”

##  6 国际化properties文件

The final step is to create a properties file in the src/main/resources directory with the name provided in the basename in step 4:

### 6.1 messages.properties

```properties
email.notempty=Please provide valid email id.
```

Here we can take advantage of internationalization along with this. Let's say we want to show messages for a French user in their language.

In this case, we have to add one more property file with the name the `messages_fr.properties` in the same location (No code changes required at all):

### 6.2 messages_fr.properties

```properties
email.notempty=Veuillez fournir un identifiant de messagerie valide.
```

## 7 结论

In this article, we covered how the default validation messages can be changed without modifying the code if the configuration is done properly beforehand.

We can also leverage the support of internationalization along with this to make the application more user-friendly.

---

## 8 使用并解析message

前文介绍了如何使用MessageResource进行参数校验时的国际化信息展现，最后补充如何在其他部分展现国际化的信息，最显著的一个使用场景就是错误消息的展现。

配置好`messages.properties`文件之后，我们可以定义一个错误信息的枚举类：

```properties
#  messages.properties
satisfied.resource.not.found=要处理的资源不存在
unknown.error=未知错误

#  other promote messages
no.specific.id.resource=对应id的资源不存在
```

```java
@Getter
public enum ReqState {
    RESPONSE_ADVICE_ERROR(500_08, "response.advice.error"),
    SATISFIED_RESOURCE_NOT_FOUND(500_09,"satisfied.resource.not.found"),

    UNKNOWN_ERROR(600_00, "unknown.error");

    private int code;
    private String message;

    ReqState(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
```

和在`@NotEmpty`注解中使用方式不一样，这里只需要以字符串的形式直接引用即可。当然，这个消息还需要解析（实际上消息是以key-value的形式配置的，以key的形式引用，而要以value的形式呈现，在多语言的环境，可以实现"一次引用，多种呈现”的目的），解析的方式也很简单：

```java
@Autowired
MessageResource messageSource;

messageSource.getMessage("unknown.error", null, LocaleContextHolder.getLocale()))
```

> 如果此处像文章开头说的那样，使用`webMvcProperties.getLocale()`的话，在获取HTTP Header设置的Loacle时有些问题。此处使用了`LocaleContextHolder.getLocale()`，LocaleContextHolder可以灵活地获取每一次Servlet请求的Locale信息。

我们不妨看看WebMvcProperties类的Locale域：

```java
/**
* Locale to use. By default, this locale is overridden by the "Accept-Language" header.
*/
private Locale locale;
```

注意到，可以通过设置HTTP请求头的方式来设置Locale信息。

实际上，测试发现，通过设置`Accept-Language`请求头，配合使用`LocaleContextHolder.getLocale()`获取Locale信息，可以实现国际化效果，而使用`webMvcProperties.getLocale()`无法总是正确获取请求头设置的Locale信息。

还有一点就是，LocaleContextHolder是通过静态方法获取的Locale信息，相较于webMvcProperties的实例方法，免去了注入`WebMvcProperties`的麻烦。

### 8.1 LocaleContextHolder和Accept-Language

现在我们知道，可以通过`LocaleContextHolder`和设置`Accept-Language`头动态获取请求的Locale信息，那么我们可以在控制器中[这样使用Locale信息](https://stackoverflow.com/questions/33049674/elegant-way-to-get-locale-in-spring-controller)：

```java
@Controller
public class WifeController {
    @Autowired
    private MessageSource msgSrc;

    @RequestMapping(value = "/wife/mood")
    public String readWife(Model model, @RequestParam("whatImDoing") String iAm) {
        // 获取Locale信息
        Locale loc = LocaleContextHolder.getLocale();
        if(iAm.equals("playingXbox")) {
            model.addAttribute( "statusTitle", msgSrc.getMessage("mood.angry", null, loc) );
            model.addAttribute( "statusDetail", msgSrc.getMessage("mood.angry.xboxdiatribe", null, loc) );
        }
        return "moodResult";
    }
}
```

不过，在每个控制器里都需要获取一次Loacle信息，这样的方式似乎有点繁琐。那么是否可以简单一点呢？显然是可以的。

[springMvc v3.2.x doc 17.3.3](https://docs.spring.io/spring-framework/docs/3.2.x/spring-framework-reference/html/mvc.html#mvc-ann-methods)中定义了控制器方法支持的参数：

>...
>
> `java.util.Locale` for the current request locale, determined by the most specific locale resolver available, in effect, the configured `LocaleResolver` in a Servlet environment.
>
>...

也就是说，Locale可以直接作为参数被HTTP请求传递进来。因此，可以这样改造上述控制器：

```java
@RequestMapping(value = "/wife/mood")
public String readWife(Model model, @RequestParam("whatImDoing") String iAm, Locale loc) {
    if(iAm.equals("playingXbox")) {
        model.addAttribute( "statusTitle", msgSrc.getMessage("mood.angry", null, loc) );
        model.addAttribute( "statusDetail", msgSrc.getMessage("mood.angry.xboxdiatribe", null, loc) );
    }
    return "moodResult";
}
```

这样简洁多了，SpringMvc简直太聪明了！等等，通过`spring.mvc.locale=zh_CN`或通过`Accept-Language: en;q=0.7,zh-TW;q=0.8,zh-CN;q=0.7`这样的形式配置MVC context的Locale信息还是有点麻烦，并且这样的话，前端每次请求都需要手动设置（校验）请求头，麻烦！

> 默认情况下，浏览器发起请求的`Accept-Language`是根据用户语言设置的。

文章到此，我们已经可以通过配置**WebMvcProperties**和设置**Accept-Language**请求头来**设置**Spring MVC Context的Locale信息；并且通过`LocaleContextHolder.getLocale()`方法或者直接在控制器中传递`Locale`参数的形式**获取**Locale信息。

### 8.2 Locale Resolver

这样看来，国际化的配置还是不够灵活，配置文件的加载以及请求头的设置这两种方法都略显笨重。

去找找文档看看其他的思路吧：

- [(旧版本)springMvc-3.2.x-17.8](https://docs.spring.io/spring-framework/docs/3.2.x/spring-framework-reference/html/mvc.html#mvc-localeresolver)
- [spring webMvc doc](https://docs.spring.io/spring-framework/docs/current/reference/html/web.html#mvc-localeresolver)

当请求进入到控制器时，`DispatcherServlet`会寻找locale resolver，并使用其设置Locale。使用`RequestContext.getLocale()`方法总是可以获取到Locale信息：

```java
@GetMapping("/resolver/locale")
public ReqResult<?> locale(HttpServletRequest request) {
    // 构建RequestContext
    RequestContext rc = new RequestContext(request);
    log.info("locale: {}", rc.getLocale());
    return ReqResult.ok(rc.getMessage("http.ok"), rc.getLocale());
}
```

这个控制器可能的返回结果为：

```json
{
    "code": 20000,
    "msg": "success",
    "data": "en"
}
{
    "code": 20000,
    "msg": "成功",
    "data": "zh_CN"
}
```

> `RequestContext`可以很方便的获取请求中包含的信息，可能的参数绑定（校验）错误等，还能直接获取Spring Message，很强大。
>
> 注意到，ServletRequest也有一个`getLocale()`方法，那么，我们直接从Request中获取Locale不是很方便么？就像这样：
>
```java
 @GetMapping("/request/locale")
public ReqResult<?> locale(HttpServletRequest request, HttpServletResponse response){
    // TODO why this method always return client default locale?
    return ReqResult.ok(request.getLocale());
}
```

> 哈哈。似乎一切都完美。不过，注意看`ServletRequest.getLocale()`的[文档](https://docs.oracle.com/javaee/6/api/javax/servlet/ServletRequest.html#getLocale())你就会发现问题:
>> Returns the **preferred** Locale that the client will accept content in, *based on the Accept-Language header*. If the client request doesn't provide an Accept-Language header, this method returns the default locale for the server.
>
> 也就是说，从request中获取的并不是获取的Spring MVC Context当前使用的Locale信息。这一点在使用了`LocaleChangeInterceptor`之后，更能够得到[证明](#proof)。

除了`RequestContext`的方式之外，还可以通过配置拦截器、通过特定的条件（比如请求参数）来更改Locale。

文档提到了几种不同的`LocaleResolver`：

- AcceptHeaderLocaleResolver

    这个locale resolver已经在前文讨论过了，通过设置HTTP Header的`Accept-Language`请求头可以设置SpringMvc Context的Locale信息。这个resolver在前文就已经试验过了。
- CookieLocaleResolver

    这个locale resolver检查cookie中是否声明了Locale信息，如果有，则使用之。
- SessionLocaleResolver

    这个locale resolver可以从当前请求的HttpSession中获取Locale和TimeZone信息。由于和Session相关，故在切换Locale时没有cookie灵活，只有session关闭之后Locale配置才能重新设置。
- LocaleChangeInterceptor

    这是推荐使用的方式，通过拦截器+请求参数实现国际化。

### 8.3 通过LocaleChangeInterceptor实现国际化

以下两篇文章分别使用xml和java Bean的方式配置了`LocaleChangeInterceptor`，通过地址栏参数展现国际化信息：

- [[基于xml的配置]Spring MVC Internationalization (i18n) and Localization (i10n) Example](https://howtodoinjava.com/spring-mvc/spring-mvc-internationalization-i18n-and-localization-i10n-example/#add_localeresolver_support)
- [[基于java bean的配置]LOCALE AND INTERNATIONALIZATION IN SPRING MVC](https://learningprogramming.net/java/spring-mvc/locale-and-internationalization-in-spring-mvc/)

参考配置地址：

- https://github.com/wangy325/mybatis-plus-starter/blob/master/web-security-demo/src/main/java/com/wangy/config/MessageSourceConfig.java
- https://github.com/wangy325/mybatis-plus-starter/blob/master/web-security-demo/src/main/java/com/wangy/config/WebConfig.java

不妨看看`LocaleChangeInterceptor`是如何工作的：

```java
@Override
public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
        throws ServletException {
    // 从请求路径中获取Locale参数
    String newLocale = request.getParameter(getParamName());
    if (newLocale != null) {
        if (checkHttpMethod(request.getMethod())) {
            // locale resovler
            LocaleResolver localeResolver = RequestContextUtils.getLocaleResolver(request);
            if (localeResolver == null) {
                throw new IllegalStateException(
                        "No LocaleResolver found: not in a DispatcherServlet request?");
            }
            try {
                // 设置Locale信息
                localeResolver.setLocale(request, response, parseLocaleValue(newLocale));
            }
            catch (IllegalArgumentException ex) {
                if (isIgnoreInvalidLocale()) {
                    if (logger.isDebugEnabled()) {
                        logger.debug("Ignoring invalid locale value [" + newLocale + "]: " + ex.getMessage());
                    }
                }
                else {
                    throw ex;
                }
            }
        }
    }
    // Proceed in any case.
    return true;
}
```

可以看到，`LocaleChangeInterceptor`的工作方式比较简单：

1. 从**路径参数**中获取Locale参数配置
2. 获取LocaleResolver
3. 利用LocaleResolver重新设置步骤1中获取的Locale配置

这里有一个重点：LocaleResolver。如果不在项目中显示的配置`LocaleResolver`，那么此拦截器获取到的实例是`AcceptHeaderLocaleResolver`，这很致命：

```java
// AcceptHeaderLocaleResolver.java
@Override
	public void setLocale(HttpServletRequest request, @Nullable HttpServletResponse response, @Nullable Locale locale) {
		throw new UnsupportedOperationException(
				"Cannot change HTTP accept header - use a different locale resolution strategy");
	}
```

因为`AcceptHeaderLocaleResolver`的`setLocale()`方法直接抛出异常，导致Locale信息无法被设置。

所以，如果使用`LocaleChangeInterceptor`，那么必须要显式配置一个`LocalResolver`，可以是`SessionLocaleResolver`或者`CookieLocaleResolver`：

```java
@Bean
public SessionLocaleResolver localeResolver() {
    SessionLocaleResolver sessionLocaleResolver = new SessionLocaleResolver();
    // 配置默认Locale
    sessionLocaleResolver.setDefaultLocale(locale);
    return sessionLocaleResolver;
}
```

这样，保证即使不传递路径国际化参数，也能使用默认的Locale配置。

<span id="proof">现在</span>，我们再回头看看从HttpServletRequest中获取当前MVC Context 的Locale信息失败的原因：

1. `LocaleChangeInterceptor`不与`AcceptHeaderLocaleResolver`兼容
2. HttpServletRequest从`Accept-Language`中获取Locale配置，否则返回服务器默认Locale信息

这应该比较好理解了，即使设置了`Accept-language`，这个设置也不能被配置了`LocaleChangeInterceptor`的mvc容器采纳。

## 9 参考

- 原文地址： https://www.baeldung.com/spring-custom-validation-message-source
- [简单使用MessageSource](https://zetcode.com/spring/messagesource/)
- [[stackoverflow] MessageSource配置异常](https://stackoverflow.com/questions/15065734/spring-framework-no-message-found-under-code-for-locale/39371075)
- [[stackoverflow] 2个MessageSource的区别1](https://stackoverflow.com/questions/39685399/reloadableresourcebundlemessagesource-vs-resourcebundlemessagesource-cache-con)
- [[github issue] 2个MessageSource的区别2](https://github.com/spring-projects/spring-framework/issues/12050)
- [如何设置HTTP请求头Accept-Language](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Accept-Language)
- [官方文档：使用messageSource进行国际化](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#context-functionality-messagesource)
- [官方文档：Spring MVC locale resovler](https://docs.spring.io/spring-framework/docs/current/reference/html/web.html#mvc-localeresolver)
- [HttpServletRequest并不能直接获取spring MVC Context当前的Locale信息](https://stackoverflow.com/questions/46412984/controller-httpservletrequest-locale-does-not-change)

[^1]: `LocaleContextHolder`是它的完美替代。
[^2]: 从文档和一些其他的资料来看，RRBMS是可以从任意位置读取配置文件的，不过笔者并没有实践这一说法。
