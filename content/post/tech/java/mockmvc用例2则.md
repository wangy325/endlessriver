---
title: "在SpringBoot项目中使用MockMvc进行接口测试"
date: 2021-02-07
lastmod: 2020-02-22
draft: false
tags: [测试, mockito]
categories: [java,springboot,mockito]
author: "wangy325"
hasJCKLanguage: true
weight: 10
mathjax: true
autoCollapseToc: false
---

> 现在流行在项目中使用[swagger](swagger.io)对接口进行测试，这确实很方便、直观。
>
> 但是MockMvc作为spring-test包中指定的测试框架，在没有使用swagger的项目中，使用其进行测试是很好的选择。

本文简单介绍在springboot项目中使用[Mockito](https://site.mockito.org/)和[MockMvc](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/test/web/servlet/MockMvc.html)对控制器进行测试。

# 1 了解Mockito

简单来说，[Mockito](https://site.mockito.org/)是一个模拟创建对象的框架，利用它提供的API，可以简化单元测试工作。Mockito的API易读性是很好的，并且错误信息也很简明。`spring-boot-starter-test`模块中引入了`mockito`依赖，如果你使用springboot，那么就可以直接使用Mockito进行单元测试。

我们从[官方API文档](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)的的引例开始，看看Mockito是如何工作的。

## 1.1 mock一个对象

```java

 // 学会使用静态导入，代码会更简洁
 import static org.mockito.Mockito.*;

 // mock List接口对象
 List mockedList = mock(List.class);

 // 使用Mock的List对象
 mockedList.add("one");
 mockedList.clear();

 // 校验某个行为是否发生过1次
 verify(mockedList).add("one");
 verify(mockedList).clear();
```

一旦mock对象被创建，mock会记住对其的所有操作，之后，你便可以选择性的<span id="v1">校验</span>这些操作。

<!--more-->

## 1.2 绑定方法参数和返回值

```java
 // 也可以mock实体类对象
 LinkedList mockedList = mock(LinkedList.class);

 // 为指定参数的操作绑定返回值（stubbing）
 when(mockedList.get(0)).thenReturn("first");
 when(mockedList.get(1)).thenThrow(new RuntimeException());

 // 打印 first
 System.out.println(mockedList.get(0));

 // 抛出 RunTimeException
 System.out.println(mockedList.get(1));

 // 打印null，因为get(999)的返回值没有指定
 System.out.println(mockedList.get(999));

 // 尽管也可以对绑定操作进行校验，不过这通常是非必要的
 // 如果你关注get(0)的返回值，那么你应该在代码里进行测试
 // 如果get(0)的返回值无关紧要，那么就没有必要进行绑定
 verify(mockedList).get(0);
```

一般来说，对于任意有返回值的方法，mockito都会返回null、原始类型/原始类型的包装类、或者一个空的集合。

返回值的绑定操作**可以被覆盖**。

```java
// 返回值的绑定可以连续设置
// 最后一次绑定就是实际调用的返回值
// 例如，mock.someMethod("some arg")将返回“foo”
when(mock.someMethod("some arg"))
    .thenThrow(new RuntimeException())
    .thenReturn("foo");

// 连续绑定的简单形式：
when(mock.someMethod("some arg"))
    .thenReturn("one", "two");
// 等价于：
when(mock.someMethod("some arg"))
    .thenReturn("one")
    .thenReturn("two");

// 抛出异常的简单形式：
when(mock.someMethod("some arg"))
    .thenThrow(new RuntimeException(), new NullPointerException());
```

一旦方法的返回值被绑定，那么其将一直返回绑定的值，无论其被调用多少次。

## 1.3 参数匹配器

上面形式的返回值绑定在测试时似乎很好用，我们构建参数，设置预期的返回结果，再进行校验即可。但仔细想想，或许少了点什么？对，少了参数的模糊匹配，比如我想绑定`get(int)`方法的返回值，无论其参数是多少。mockito自然能够为我们做到这些：

```java
 // 使用mockito内建的anyInt()来进行匹配
 when(mockedList.get(anyInt())).thenReturn("element");

 //stubbing using custom matcher (let's say isValid() returns your own matcher implementation):
 // 使用自定义matcher进行绑定
 when(mockedList.contains(argThat(isValid()))).thenReturn(true);

 //following prints "element"
 // 打印999
 System.out.println(mockedList.get(999));

 // 也可以校验方法被调用了一次
 verify(mockedList).get(anyInt());

 // mockito同样支持java8的lambda表达式进行参数匹配
 verify(mockedList).add(argThat(someString -> someString.length() > 5));
```

参数匹配可以方便地进行动态返回值绑定校验。

想了解更多关于 argument matcher和hamcrest matcher的内容，可参考：

- https://javadoc.io/static/org.mockito/mockito-core/3.8.0/org/mockito/ArgumentMatchers.html
- https://javadoc.io/static/org.mockito/mockito-core/3.8.0/org/mockito/hamcrest/MockitoHamcrest.html

除了使用matcher之外，mockito还支持使用类型（class）匹配，这种参数匹配方式在进行MVC测试时，对json参数进行序列化和反序列化时尤其有用：

```java
when(spittleService.pageQuerySpittlesByTimeLine(any(SpittleDTO.class))).thenReturn(page);

 ResultActions resultActions = mockMvc
                .perform(MockMvcRequestBuilders.post("/spittle/range/spittles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonString)
                );
```

就像上面那样，在使用`RequestBody`传参时，若使用JSON，需要对json字符串进行**反序列化**。这种情形，在进行参数绑定时，自然不能使用

```java
when(spittleService.pageQuerySpittlesByTimeLine(spittleDTO).thenReturn(page);
```

这样的形式，因为控制器接收到的必然不是这个指定的`spittleDTO`对象。使用类类型参数，mockito进行参数匹配时，使用`equals`方法比较的对象的相等性，因此可以获取绑定的返回值。

> [Sometimes it's just better to refactor the code to allow equals() matching or even implement equals() method to help out with testing](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html#argument_matchers).

## 1.4 检验方法被调用的次数

[前文](#v1)我们提到，`verify()`方法可以校验指定方法被调用过一次。

mokito提供了更加灵活的校验API，可以用来检验指定方法被调用的次数：

```java
//using mock
mockedList.add("once");

mockedList.add("twice");
mockedList.add("twice");

mockedList.add("three times");
mockedList.add("three times");
mockedList.add("three times");

// 当verify方法不指定次数时，默认检验方法调用1次，以下2个调用是等价的
verify(mockedList).add("once");
verify(mockedList, times(1)).add("once");

// add("twice)被调用了2次
verify(mockedList, times(2)).add("twice");
// add("three times")被调用了3次
verify(mockedList, times(3)).add("three times");

// add("never happened")方法没有被调用
// 等价于 times(0)
verify(mockedList, never()).add("never happened");

// 使用atLeast()/atMost()可以校验参数至少/至多被调用几次
verify(mockedList, atMostOnce()).add("once");
verify(mockedList, atLeastOnce()).add("three times");
verify(mockedList, atLeast(2)).add("three times");
verify(mockedList, atMost(5)).add("three times");
```

`times(1)`是默认，因此`verify(mockedList, times(1)).add("once")`这样的形式是不必要的。

除了上面介绍的之外，moikito还有很多使用的测试方法，具体可以参考API文档：

- https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html#in_order_verification

# 2 使用MockMvc测试控制器

介绍了mockito的基本用法，可以开始用它测试控制器了。

spring web项目的测试使用的是Spring MVC测试框架（*Spring MVC Test framework(MockMvc)*），其使用方式和Mockito很像，实际上MockMvc借用了Mockito的API，因此，熟悉Mockito的使用对使用MockMVC测试web服务大有裨益。

## 2.1 熟悉这几个静态导入

- MockMvcBuilders.*
- MockMvcRequestBuilders.*
- MockMvcResultMatchers.*
- MockMvcResultHandlers.*

和Mockito一样，熟悉并使用静态导入会让代码看起来更简洁。不过，对刚使用MockMVC进行测试的新手来说，使用静态导入可能会陷入一个麻烦：方法这么多，我怎么记得这个方法该使用哪个静态导入，容易陷入混乱。

不过，记住他们的惯用法就行了：

```java
// MockMvcBuilders.* 用于构建MockMvc应用
MockMvc mockMvc = MockMvcBuilders.stansaloneSetup(controller).build();

// MockMvcRequestBuilders.*用于构建请求
ResultActions resultActions = mockMvc.perform(MockMvcRequestBuilders.get(url));
ResultActions resultActions = mockMvc.perform(MockMvcRequestBuilders.post(url));

// MockMvcResultMatchers.*用于请求结果匹配
resultActions.andExpect(MockMvcResultMatchers.status().isOK())

// MockMvcResultHandlers.* 嘛，用得少，其提供一个print()方法，可以打印请求信息
resultActions.andDo(MockMvcResultHandlers.print());
```

## 2.2 测试示例

在进行单元测试时，通常习惯将通用模版进行抽象，本示例中也是如此，我们建立一个抽象测试类，用于准备数据、提供<span id="jsonpath">通用方法</span>等：

```java
@SpringBootTest
@TestPropertySource("classpath:application-test.properties")
public class BaseMockInit {

//    @Autowired
//    protected ObjectMapper objectMapper;
    protected ObjectMapper objectMapper = Jackson2ObjectMapperBuilder.json().build();


    protected @Mock
    ISpitterService spitterService;
    protected @Mock
    ISpittleService spittleService;
    protected SpitterController spitterController;
    protected SpittleController spittleController;

    @BeforeEach
    void initMock() {
        MockitoAnnotations.initMocks(this);
        spitterController = new SpitterController();
        spitterController.setSpitterService(spitterService);
        spittleController = new SpittleController();
        spittleController.setSpittleService(spittleService);
    }


    /**
     * Use json-path, tweaking configuration<br>
     * The config below change default action of json-path<br>
     * Use application-context ObjectMapper config as json and mapper provider<br>
     * <p>
     * Reference: <a href="https://github.com/json-path/JsonPath">
     * https://github.com/json-path/JsonPath</a>
     *
     * @param json standard json string
     * @return {@link DocumentContext}
     */
    protected DocumentContext jsonPathParser(String json) {

        final JsonProvider jsonProvider = new JacksonJsonProvider(objectMapper);
        final MappingProvider mappingProvider = new JacksonMappingProvider(objectMapper);
        Configuration.setDefaults(new Configuration.Defaults() {
            @Override
            public JsonProvider jsonProvider() {
                return jsonProvider;
            }

            @Override
            public Set<Option> options() {
                return EnumSet.noneOf(Option.class);
            }

            @Override
            public MappingProvider mappingProvider() {
                return mappingProvider;
            }
        });
        return JsonPath.parse(json);
    }
}
```

你可能注意到上面的示例中使用的`@Mock`注解和`MockitoAnnotations.initMocks(this);`方法，实际作用就是mock web测试中所需要使用到的服务层service，因为测试web模块不涉及到数据服务层的业务，因此借助Mockito即可轻松创建测试所需要的实例。

### 2.2.1 简单路径参数GET请求测试

```java
 @Test
public void getSpitterById() throws Exception {
    SpitterVO source = new SpitterVO(1, "alan", "walker", "aw", "xxx");
    Spitter spitter = new Spitter();
    BeanUtils.copyBeanProp(spitter, source);

    when(spitterService.getById(1)).thenReturn(spitter);
    spitterController.setSpitterService(spitterService);
    MockMvc mockMvc = standaloneSetup(spitterController).build();
    // perform get request with path variables
    ResultActions resultActions = mockMvc.perform(get("/spitter/1"));
    log.info(resultActions.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    resultActions.andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.data")
                    .value(objectMapper.convertValue(spitter, HashMap.class)));

    verify(spitterService).getById(1);
}
```

观察上面的测试用例，我们首先使用Mockito对数据层的mock对象进行了参数和返回值绑定，这在前文已经提及：

```java
when(spitterService.getById(1)).thenReturn(spitter);
```

随即使用MockMvc发起`get`请求，发起请求的方式有多种：

```java
ResultActions resultActions = mockMvc.perform(get("/spitter/1"));
// 等价于
ResultActions resultActions = mockMvc.perform(get("/spitter/{id}", 1));
```

当请求进入控制器时，根据控制器的业务逻辑，调用`spitterService.getById(1)`方法，该方法返回之前绑定的返回值，进行封装之后，返回web请求的结果。

上述请求返回一个`ResultActions`结果，web请求的结果被封装在内，我们可以对这个结果进行校验：

```java
resultActions.andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.data")
                    .value(objectMapper.convertValue(spitter, HashMap.class)));
```

注意到，`jsonPath("$.data")`，这意味着请求返回的json字串中包含一个`data`键，`.value()`操作暗示其对应的内容就是`spitterService.getById(1)`的返回对象。所以这个请求返回的json应该像这样：

```json
{
    "code": 200,
    "message": "ok",
    "data": {
        "id": 1,
        "usename": "aw",
        "firstname": "alan",
        "lastname": "walker",
        "password": "xxx"
    }
}
```

```java
  .andExpect(jsonPath("$.data").value(objectMapper.convertValue(spitter, HashMap.class)));
```

的意义是比较通过`jsonPath("$.data")`解析到的对象和`objectMapper.convertValue(spitter, HashMap.class))`获取到的对象的相等性。

实际上，通过`jsonPath("$.data")`获取到的内容是一个LinkedHashMap，而`.value()`的相等性比较的是map中对应键的值的相等性，**单单从这个示例**来讲，这个比较是可行的[^1]。

[^1]: 这种形式的比较往往会出现问题，例如，如果pojo类型中的`id`字段定义为`Long`型，使用objectMapper进行转换的时候*可能*会转换为`Integer`型。

最后，我们使用`verify`方法对mock对象的方法调用进行了测试：

```java
 verify(spitterService).getById(1);
```

不过，由于我们已经校验了web接口的返回值，那么mock对象的方法一定被调用了，所以一般我们无需这么做。

### 2.2.2 拼接参数的GET方法测试

### 2.2.3 POST请求方法测试












# 3 JsonPath

# 4 补充内容：服务层的测试

# 5 补充内容：使用idea直接进行RESTful接口测试

# 参考


- 本文用例所在项目地址：https://github.com/wangy325/mybatis-plus-starter
- mockito官网：https://site.mockito.org/
- mockito API官网：https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html
- MockMvc java doc：https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/test/web/servlet/MockMvc.html
- json-path仓库介绍了其基本使用方法：https://github.com/json-path/JsonPath
- 可能出现的bug：https://stackoverflow.com/questions/47276920/mockito-error-however-there-was-exactly-1-interaction-with-this-mock
- MockMvc官方文档：https://docs.spring.io/spring-framework/docs/current/reference/html/testing.html#spring-mvc-test-framework
- MockMVC官方测试示例代码库：https://github.com/spring-projects/spring-framework/tree/master/spring-test/src/test/java/org/springframework/test/web/servlet/samples
