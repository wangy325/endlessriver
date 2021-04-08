---
title: "在SpringBoot项目中使用MockMvc进行接口测试"
date: 2021-02-07
lastmod: 2021-03-08
draft: false
description: ""
tags:
 - mockito
categories:
- 单元测试
author: "wangy325"

---

现在流行在项目中使用[swagger](swagger.io)对接口进行测试，这确实很方便、直观。

但是MockMvc作为spring-test包中指定的测试框架，在没有使用swagger的项目中，使用其进行测试是很好的选择。

<!--more-->

本文简单介绍在springboot项目中使用[Mockito](https://site.mockito.org/)和[MockMvc](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/test/web/servlet/MockMvc.html)对控制器进行测试。

# 1 了解Mockito

简单来说，[Mockito](https://site.mockito.org/)是一个模拟创建对象的框架，利用它提供的API，可以简化单元测试工作。Mockito的API易读性是很好的，并且错误信息也很简明。`spring-boot-starter-test`模块中引入了`mockito`依赖，如果你使用springboot，那么就可以直接使用Mockito进行单元测试。

我们从Mockito[官方API文档](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)的的引例开始，看看Mockito是如何工作的。

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

在进行<span id="start">单元测试</span>时，通常习惯将通用模版进行抽象，本示例中也是如此，我们建立一个抽象测试类，用于准备数据、提供<span id="jsonpath">通用方法</span>等：

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

的<span id="path">意义</span>是比较通过`jsonPath("$.data")`解析到的对象和`objectMapper.convertValue(spitter, HashMap.class))`获取到的对象的相等性。

实际上，通过`jsonPath("$.data")`获取到的内容是一个LinkedHashMap，而`.value()`的相等性比较的是map中对应键的值的相等性，**单单从这个示例**来讲，这个比较是可行的[^1]。

[^1]: 这种形式的比较往往会出现问题，例如，如果pojo类中的`id`字段定义为`Long`型，使用objectMapper进行转换的时候*可能*会转换为`Integer`型。

最后，我们使用`verify`方法对mock对象的方法调用进行了测试：

```java
 verify(spitterService).getById(1);
```

不过，由于我们已经校验了web接口的返回值，那么mock对象的方法一定被调用了，所以一般我们无需这么做。

### 2.2.2 拼接参数的GET方法测试

除了路径参数，使用最多的就是形如`?para1=xxx&para2=xxx`这样的请求参数，MockMvc同样对这样的web服务提供测试支持

```java
@Test
public void getUserSpittlesPageTest() throws Exception {
    // ... 省略准备数据

    // 此处必须使用类类型作为参数
    when(spittleService.pageQuerySpittleBySpitterId(any(SpittleDTO.class))).thenReturn(page);

    // perform get with request params transferred by pojo
    ResultActions resultActions = mockMvc
        .perform(get("/spittle/user/spittles?spitterId={spitterId}", 4))
        // get element from json
        // see https://github.com/json-path/JsonPath
        .andExpect(jsonPath("$.data.currentPage")
            .value(pageDomain.getCurrentPage()))
        .andExpect(jsonPath("$.data.pageSize")
            .value(pageDomain.getPageSize()))
        .andExpect(jsonPath("$.data.pages")
            .value(pageDomain.getPages()))
        .andExpect(jsonPath("$.data.total")
            .value(pageDomain.getTotal()))
        .andDo(print());
        /* 报错原因 ：long和integer的问题*/
//            .andExpect(jsonPath("$.data.records[0]")
//                .value(objectMapper.convertValue(sample, HashMap.class)));

    String jsonResult = resultActions.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    log.info(jsonResult);
    // verify is not necessary here
    verify(spittleService).pageQuerySpittleBySpitterId(any(SpittleDTO.class));

    assertEquals((int) jsonPathParser(jsonResult).read("$.data.records.length()"), 1);
    SpittleVO rvo = jsonPathParser(jsonResult).read("$.data.records[0]", SpittleVO.class);
    assertEquals(sample, rvo);
}
```

这个测试和上一个测试有一些区别，首先第一个区别就是mock对象的参数与返回值绑定方式变了：

```java
 when(spittleService.pageQuerySpittleBySpitterId(any(SpittleDTO.class))).thenReturn(page);
```

多数情况下，我们不会直接在控制器中使用具体的参数，而是使用Java Bean作为控制器的参数。这个时候，Spring MVC的`MappingJasksonHttpMessageConverter`将会发挥作用[^2]，将请求中的中的参数转换为对应的Java Bean实例。

[^2]: 关于Spring MVC的消息转换器，参考《Spring实战，第4版》第16章相关内容。

这样一来，我们便不能指定某一个实例作为mock对象的参数了，只能使用`any(class)`这样的形式进行模糊匹配。

其次，关于使用地址栏参数的参数传递，除了使用上述的方式（最简单）之外，还有其他的方式：

```java
  ResultActions resultActions = mockMvc.perform(get("/spittle/user/spittles?spitterId={spitterId}", 4))
  // 等价于
  ResultActions resultActions = mockMvc.perform(get("/spittle/user")).param("spitterId", 4)
```

第三，如果再次使用类似于[上一个示例](#path)那样校验返回数据的方法校验`$.data.records[0]`，将会得到一个错误。原因也和前文描述的一样。我们必须使用更为稳妥的方法。

第四，对于同一个控制器的测试，我们可以预先做一些设置，比如依赖`@BeforeEach`注解，约定好一些通用的内容：

```java
class MyWebTests {

    MockMvc mockMvc;

    @BeforeEach
    void init(){
        mockMvc = standaloneSetup(spittleController)
                .alwaysExpect(status().isOk())
                .alwaysExpect(content().contentType(MediaType.APPLICATION_JSON))
                .build();
    }
}
```

上述方法在每一个测试之前准备mockMvc对象，并且约定了servlet的返回状态和返回类型。


### 2.2.3 POST请求方法测试

如前所述，在发起<span id = "post">POST请求</span>时，一般使用JSON，此时`MappingJasksonHttpMessageConverter`便会介入。它负责将JSON对象反序列化为控制器指定的Java Baean。在使用MockMvc进行测试时，我们直接使用JSON字符串，将其设置在请求体中即可。

```java
@Test
public void postSpittlesTimeLinePageTest() throws Exception {
    // ... 省略其他设置
    dto.setLeftTime(LocalDateTime.parse("2012-06-09T00:00:00.000"));
    dto.setRightTime(LocalDateTime.parse("2012-06-09T23:59:59.999"));

    when(spittleService.pageQuerySpittlesByTimeLine(any(SpittleDTO.class))).thenReturn(page);

    // perform post request
    String s = objectMapper.writeValueAsString(dto);
    log.info("request body: {}", s);
    ResultActions resultActions = mockMvc
        .perform(post("/spittle/range/spittles")
            .contentType(MediaType.APPLICATION_JSON)
            .characterEncoding("utf8")
            .content(s))
        .andDo(print());

    // 以下用来获取MockMvc返回(Json)
    String jsonResult = resultActions.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    log.info(jsonResult);

    PageDomain<SpittleVO> rpg = jsonPathParser(jsonResult).read("$.data", PageDomain.class);
    assertEquals((int) jsonPathParser(jsonResult).read("$.data.records.length()"), 1);
    SpittleVO rvo = jsonPathParser(jsonResult).read("$.data.records[0]", SpittleVO.class);
    rpg.setRecords(new ArrayList<SpittleVO>() {{
        add(rvo);
    }});
    assertEquals(rpg, pageDomain);
}
```

可以看到，发起POST请求的方式比较简单：

```java
 ResultActions resultActions = mockMvc
        .perform(post("/spittle/range/spittles")
            .contentType(MediaType.APPLICATION_JSON)
            .characterEncoding("utf8")
            .content(s));
```

设置好请求头接受的文件类型和编码，使用`content(json)`方法传入json字符串即可。

在本节的[开头](#start)，我们进行了一些通用的配置，你可能暂时还没有注意到这个细节：

```java
//    @Autowired
//    protected ObjectMapper objectMapper;
    protected ObjectMapper objectMapper = Jackson2ObjectMapperBuilder.json().build();
```

我们注释掉了spring自动装配的`ObjectMapper`，转而使用了`Jackson2ObjectMapperBuilder`构建了一个默认的`ObjectMapper`，这样做是有原因的：

对于spring自动装配的`ObjectMapper`，我们在项目改变了其对`LocalDateTime`的序列化与反序列化规则：

> 对于`LocalDateTime`，默认情况下其字符串输出格式类似于`2012-06-09T23:59:59.999`，这样的字符串形式非常不利于页面传递参数，因此我们在项目配置中改变了其规则，使得在实际使用时，能够将`2012-06-09 23:59:59.999`形式的日期字符串直接转化为`LocalDateTime`对象；反之，`LocalDateTime`也将会直接转化为`2012-06-09 23:59:59.999`的形式返回。

但是在使用MockMvc进行测试时，其进行反序列化时（将请求JSON转化为Java Bean），使用的可能是默认的消息转换规则。而当我们使用自动装配的`ObjectMapper`将配置好的Bean转化为JSON时，时间的字符串形式是`2012-06-09 23:59:59.999`，默认的消息转换无法将其转化为`LocaldateTime`，因此会出现**转换异常**。

关于`ObjactMapper`的详细内容，会在后续博客中详细介绍。

# 3 JsonPath

看到这里，你可能对使用Mockito和MockMvc进行测试有了初步的了解。不过如果你细心的话，就会发现，前面的测试用例对最后的接口的返回校验都没有提及。并且示例代码中关于提取返回内容出现最多的字就是`jsonPath`。

并且在前面的测试用例中，我们也通过简单的表达式`jsonPath("$.data")`提取了返回JSON中的结果。

实际上，Spring MockMvc默认是支持使用JsonPath获取返回内容的，就像`jsonPath("$.data")`那样，不过其灵活性没有直接使用JspnPath大，特别是在反序列化的操作上。

很多时候，RESTful接口返回的内容实际上是Java Bean序列化之后的JSON串，所以我们希望将获取到的JSON反序列化之后再进行校验，而MockMvc在这方面表现的就比较蹩脚了，其只能转化为Map进行比较，就像[###2.2.1节](#path)中表现的那样[^3]。

[^3]: 或许笔者还没有找到更加优雅的方法。

说实话，测试在获取到返回的JSON串，通过控制台打印输出确认符合预期基本上就可以结束，再去检验JSON的内容有点**强迫症**的意味了。

其实在[JsonPath](https://github.com/json-path/JsonPath)的仓库里详细地介绍了JsonPath的基本用法，针对本实例的具体情况，通过阅读文档，我们可以很容易取得想要的值并进行校验。

```json
{
    "code":20000,
    "msg":"http.ok",
    "data":
        {
            "currentPage":1,
            "pageSize":10,
            "total":4,
            "pages":1,
            "records":
                [
                    {
                    "id":1,
                    "spitterId":4,
                    "message":"sixth man",
                    "time":"2012-06-09 22:20:00",
                    "latitude":0.0,
                    "longitude":0.0
                    }
                ]
        }
}
```

我们要校验的就是`data`中的内容，现在我们再回过头来看看上面的[测试代码](#post)，实际上很容易理解:

```java
PageDomain<SpittleVO> rpg = jsonPathParser(jsonResult).read("$.data", PageDomain.class);
    assertEquals((int) jsonPathParser(jsonResult).read("$.data.records.length()"), 1);
    SpittleVO rvo = jsonPathParser(jsonResult).read("$.data.records[0]", SpittleVO.class);
    rpg.setRecords(new ArrayList<SpittleVO>() {{
        add(rvo);
    }});
    assertEquals(rpg, pageDomain);
```

首先我们获取了`$.data`节点的内容，里面也是一个Json对象，按照*传统的*反序列化理解，这是一个Java Bean，我们该如何将其读取为我们程序中的Bean呢，JsonPath也[作了说明](https://github.com/json-path/JsonPath#what-is-returned-when)

> 默认情况下，通过`JsonPath.parse(json).read("$.data")`获取的到的是Map实例，并不会映射为Java Bean。不过JsonPath也为此提供了可能：
>> If you configure JsonPath to use JacksonMappingProvider or GsonMappingProvider you can even map your JsonPath output directly into POJO's.

要想映射为JavaBean，我们需要：

- 自定义配置JsonProvider
- 传入类型参数

配置JsonProvider的方式也很简单：

```java
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
```

此时，我们就已经获取到了接口返回的对象。不过等等，我们再仔细看看上面的Json，会发现`$.data.records`节点是一个数组，数组里面又是可以映射为Java Bean的Json。而经过上一步，获取的`PageDomain`对象中的`records`域实际上还是一个`List<Map>`的默认映射结果，所以我们还需要梅开二度。


# 4 补充内容：使用idea直接进行RESTful接口测试

到这里，本文的主要内容就结束了。

如果你使用的IDEA，你不妨找找`tools->httpClients`，你会发现，idea的绝妙功能：其可以通过脚本文件测试rest接口。

idea提供了不同HTTP请求的脚本示例，很容易就能上手，脚本文件以`.http`结尾，你可轻松创建自己的测试脚本。

例如，我为上面的测试创建一个名为`rest-api.http`的脚本：

```http
### get spitter info by spitterId
GET {{host}}/spitter/{{spitterId}}?lang={{lang}}
Accept: application/json


### 分页获取spittle， 根据用户spitterId，请求参数放在GET请求体中的情形:
GET {{host}}/spittle/user/spittles?lang={{lang}}
Accept: */*
Content-Type: application/json

{
  "spitterId": 4,
  "currentPage": 1,
  "pageSize": 1
}


### 分页获取某个时间段的spittle 1
POST {{host}}/spittle/range/spittles?lang={{lang}}
Content-Type: application/json

{
  "leftTime": "2012-06-09 00:00:00",
  "rightTime": "2012-06-09 23:59:59",
  "currentPage":2,
  "pageSize": 1
}
```

可以看到，`.http`脚本文件的可读性非常强。其中，为了方便，还使用了用双花括号语法的**环境变量**，这些变量被命名在一个名为`http-client-env.json`的json文件中：

```json
{
  "mem": {
    "host":"http://localhost:9000/mem",
    "spitterId": 4,
    "lang": "en",
    "currentPage": 1,
    "pageSize": 2
  },
  "mysql":{
    "host": "http://localhost:9100/dev",
    "spitterId": 2,
    "lang": "en"
  }
}
```

运行脚本时，可以通过执行环境配置传入不同的测试参数，就这么简单。

---


# 参考

- 本文用例所在项目地址：https://github.com/wangy325/mybatis-plus-starter
- mockito官网：https://site.mockito.org/
- mockito API官网：https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html
- MockMvc java doc：https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/test/web/servlet/MockMvc.html
- json-path仓库介绍了其基本使用方法：https://github.com/json-path/JsonPath
- 可能出现的bug：https://stackoverflow.com/questions/47276920/mockito-error-however-there-was-exactly-1-interaction-with-this-mock
- MockMvc官方文档：https://docs.spring.io/spring-framework/docs/current/reference/html/testing.html#spring-mvc-test-framework
- MockMVC官方测试示例代码库：https://github.com/spring-projects/spring-framework/tree/master/spring-test/src/test/java/org/springframework/test/web/servlet/samples
