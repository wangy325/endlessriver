---
title: "在SpringBoot中使用MessageSource"
date: 2021-02-20
lastmod: 2021-02-20
draft: false
tags: [国际化,springboot]
categories: [java,spring]
author: "wangy325"
weight: 10
hasJCKLanguage: true
toc: true
autoCollapseToc: false
---


> 注：这篇文章主要介绍了校验信息的国际化，MessageSource的配置逻辑是通用的。
>
> 几个说明：
>
> 1. ~~properties配置文件中，`spring.messages.basename`**必须**要加classpath前缀。如 `spring.messages.basename=classpath:i18n/messages`~~；
> 2. ~~必须要手动配置`MessageSource`，springboot不会自动配置之~~；
> 3. 如果使用`MessageSource.getMessage()`方法，第一个参数的引用形式为`"code"`，而不是`"{code}"`或者`"${code}"`。如messageSource.getMessage("test.msg", null, ~~Locale.getDefault()~~)；
> 4. 在配置`LocalValidatorFactoryBean`之后，才可以在`javax.validation.constraints`包下的注解（`@Size`，`@NotNull`...）下的***message***属性中使用`"{code}"`的形式声明校验提示信息。如
> `@NotNull(message = "{leftTime.not.null}")`；
> 5. springMVC的locale配置和JVM的locale配置不一样，在application.properties中配置的`spring.mvc.locale=zh_CN`实际上配置的是`WebMvcProperties`，在获取消息时，locale信息应该从`webMvcProperties.getLocale()`中获取**而不是**使用`Locale.getDefault()`获取。

---

# 1 概览

MessageSource is a powerful feature available in Spring applications. This helps application developers handle various complex scenarios with writing much extra code, such as environment-specific configuration, internationalization or configurable values.

One more scenario could be modifying the default validation messages to more user-friendly/custom messages.

In this tutorial, we'll see how to configure and manage custom validation MessageSource in the application using Spring Boot.

<!--more-->

# 2 引入Maven依赖

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

# 3 自定义校验信息示例

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

#  4 配置MessageSource

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

## 4.1 关于MessageSource的自动配置

实际上，Spring Boot可以自动配置MessageSourece，不过，想要成功配置，有2个条件：

1. Spring Boot自动配置实际上使用的是**ResourceBundleMessageSourece**，不同于**ReloadableResourceBundleMessageSource**
2. 你无需再配置别名为"messageSource"的Bean，也就是说上述的配置必须忽略掉

不妨看看MessageSource自动配置相关的类，具体内容在`org.springframework.boot.autoconfig.context.MessageSourceAutoConfiguration.java`包中：

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

我们只需要关注`getResources`方法，可以看到，其自动补全了classpath前缀，因此，`ResourceBundleMessageSourece`总是从classpath中获取资源的。

如果这两个条件都满足，那么SpringBoot会自动使用**ResourceBundleMessageSourece**配置MessageSource。

## 4.2 ResourceBundleMessageSourece和ReloadableResourceBundleMessageSourece的区别

可以看到，在本文的文首，标注了几个实践时需要注意的点，现在看来，前2点都是**错误的表述**，因为当时实践时使用的是`ReloadableResourceBundleMessageSourece`，并且没有搞清楚Spring Boot自动配置MessageSource的条件。

关于这2个“MessageSource”的区别，github上有一个经典的issue，大意是如果不使用classpath前缀，前者可以读取消息，后者不能读取消息。spring开发人员的回复一针见血：

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
- ReloadableResourceBundleMessageSourece可以从任意位置[^尚未实践]读取配置文件
- 从名字来看，Reloadable是可以动态加载配置文件的，事实上也确实如此，它有一个属性`cacheSeconds`，用来设置缓存配置文件的时间间隔：
  - 默认值是 -1，意味着不动态加载配置文件
  - 如果配置值为0，那么每次获取消息时就会检查配置文件的改动，**这个配置值要慎用**
  - 如果配置为其他正整数，则会在固定间隔后检查配置文件改动

参考： https://stackoverflow.com/questions/39685399/reloadableresourcebundlemessagesource-vs-resourcebundlemessagesource-cache-con

# 5 配置LocalValidatorFactoryBean

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

#  6 国际化properties文件

The final step is to create a properties file in the src/main/resources directory with the name provided in the basename in step 4:

## 6.1 messages.properties

```properties
email.notempty=Please provide valid email id.
```

Here we can take advantage of internationalization along with this. Let's say we want to show messages for a French user in their language.

In this case, we have to add one more property file with the name the `messages_fr.properties` in the same location (No code changes required at all):

## 6.2 messages_fr.properties

```properties
email.notempty=Veuillez fournir un identifiant de messagerie valide.
```

# 7 结论

In this article, we covered how the default validation messages can be changed without modifying the code if the configuration is done properly beforehand.

We can also leverage the support of internationalization along with this to make the application more user-friendly.

本文介绍了如何使用配置文件修改检验信息，去除硬编码。同时，使用spring国际化支持构建更加友好的应用程序。

# 8 使用并解析message

前文介绍了如何使用MessageResource进行参数校验时的国际化信息展现，最后补充如何在其他部分展现国际化的信息，最显著的一个使用场景就是错误消息的展现。

配置好ResourceBundle之后，我们可以定义一个错误信息的枚举类：

```properties
# messages.properties
satisfied.resource.not.found=要处理的资源不存在
unknown.error=未知错误

# other promote messages
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

和在`@NotEmpty`注解中使用方式不一样，这里只需要以字符串的形式直接引用即可。当然，这个消息还需要解析，解析的方式也很简单：

```java
@Autowired
MessageResource messageSource;
@Autowired
WebMvcProperties webMvcProperties;

messageSource.getMessage("unknown.error", null, webMvcProperties.getLocale()))
```

需要注意的是locale的获取，以及如何灵活的配置Locale（根据需求热配置）。

# 9 References

- https://zetcode.com/spring/messagesource/
- https://www.baeldung.com/spring-custom-validation-message-source
- https://stackoverflow.com/questions/15065734/spring-framework-no-message-found-under-code-for-locale/39371075
- https://stackoverflow.com/questions/39685399/reloadableresourcebundlemessagesource-vs-resourcebundlemessagesource-cache-con
- https://github.com/spring-projects/spring-framework/issues/12050
