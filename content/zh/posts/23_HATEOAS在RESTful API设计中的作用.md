---
title: "在RESTful API设计中应用HATEOAS"
date: 2024-11-26
author: wangy325
BookToC: true
categories: []
tags: [Spring]
---

HATEOAS 是 REST(Representational state transfer) 的约束之一。

HATEOAS 是 Hypermedia As The Engine Of Application State 的缩写，从字面上理解是 “**超媒体即是应用状态引擎**” 。其原则就是客户端与服务器的交互完全由超媒体动态提供，客户端无需事先了解如何与数据或者服务器交互。相反的，在一些RPC服务或者Redis，Mysql等软件，需要事先了解接口定义或者特定的交互语法。

<!--more-->

## HATEOAS在REST中的地位

在Richardson Maturity Model模型中，将RESTful分为四步,其中第四步 Hypermedia Controls 也就是HATEOAS。

- 第一个层次（Level 0）的 Web 服务只是使用 HTTP 作为传输方式，实际上只是远程方法调用（RPC）的一种具体形式。SOAP 和 XML-RPC 都属于此类。
- 第二个层次（Level 1）的 Web 服务引入了资源的概念。每个资源有对应的标识符和表达。
- 第三个层次（Level 2）的 Web 服务使用不同的 HTTP 方法来进行不同的操作，并且使用 HTTP 状态码来表示不同的结果。如 HTTP GET 方法来获取资源，HTTP DELETE 方法来删除资源。
- 第四个层次（Level 3）的 Web 服务使用 HATEOAS。在资源的表达中包含了链接信息。客户端可以根据链接来发现可以执行的动作。

REST的设计者Roy T. Fielding在博客 [REST APIs must be hypertext-driven](https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven) 中的几点原则强调非HATEOAS的系统不能称为RESTful。

1. REST API决不能定义固定的资源名称或者层次关系。
2. 使用REST API应该只需要知道初始URI（书签）和一系列针对目标用户的标准媒体类型。

## HATEOAS 例子

通过实现HATEOAS，每个资源能够描述针对自己的操作资源，动态的控制客户端，即便更改了URL也不会破坏客户端。

下面是个例子,首先是一个GET请求

```html
    GET /account/12345 HTTP/1.1
    Host: somebank.org
    Accept: application/xml
    ...
```

将会返回

```html
   HTTP/1.1 200 OK
   Content-Type: application/xml
   Content-Length: ...

   <?xml version="1.0"?>
   <account>
      <account_number>12345</account_number>
      <balance currency="usd">100.00</balance>
      <link rel="deposit" href="https://somebank.org/account/12345/deposit" />
      <link rel="withdraw" href="https://somebank.org/account/12345/withdraw" />
      <link rel="transfer" href="https://somebank.org/account/12345/transfer" />
      <link rel="close" href="https://somebank.org/account/12345/close" />
    </account>
```

返回的body不仅包含了账号信息：*账户编号:12345，账号余额100*，同时还有四个可执行链接分别可以执行`deposit`,`withdraw`,`transfer`和`close`。

一段时间后再次查询用户信息时返回

```html
   HTTP/1.1 200 OK
   Content-Type: application/xml
   Content-Length: ...

   <?xml version="1.0"?>
   <account>
       <account_number>12345</account_number>
       <balance currency="usd">-25.00</balance>
       <link rel="deposit" href="https://somebank.org/account/12345/deposit" />
   </account>
```

这时用户账号余额产生**赤字**，可操作链接只剩一个`deposit`, 其余三个在赤字情况下无法执行。

## HATEOAS的好处

让API变的可读性更高 ，实现客户端与服务端的*部分*解耦。对于不使用 HATEOAS 的 REST 服务，客户端和服务器的实现之间是紧密耦合的。客户端需要根据服务器提供的相关文档来了解所暴露的资源和对应的操作。当服务器发生了变化时，如修改了资源的 URI，客户端也需要进行相应的修改。而使用 HATEOAS 的 REST 服务中，客户端可以通过服务器提供的资源的表达来智能地发现可以执行的操作。当服务器发生了变化时，客户端并不需要做出修改，因为资源的 URI 和其他信息都是动态发现的。

## Spring对HATEOAS的支持

Spring-HATEOAS允许我们创建遵循HATEOAS原则的API，显示给定资源的相关链接。

HATEOAS原则指出，API应该通过返回每个服务响应可能的后续步骤的信息来为客户提供指导。

使用Spring-HATEOAS，可以快速创建指向资源表示模型的链接的模型类。

以下是一个在Spring Boot应用中快速使用Spring-HATEOAS的例子：

```java
    @RequestMapping(value = "/{licenseId}", method = RequestMethod.GET)
    public ResponseEntity<License> getLicense(@PathVariable("organizationId")   String organizationId,
                                              @PathVariable("licenseId") String licenseId) {
        License license = licenseService.getLicense(licenseId, organizationId);
        // HATEOAS的接口
        license.add(
            linkTo(methodOn(LicenseController.class).getLicense(organizationId, license.getLicenseId())).withSelfRel(),
            linkTo(methodOn(LicenseController.class).createLicense(organizationId, license, null)).withRel("createLicense"),
            linkTo(methodOn(LicenseController.class).updateLicense(organizationId, license)).withRel("updateLicense"),
            linkTo(methodOn(LicenseController.class).deleteLicense(organizationId, license.getLicenseId())).withRel("deleteLicense")
        );

        return ResponseEntity.ok(license);
    }

    public class License extends RepresentationModel<License> { }
```

其中的模型类`License`继承了`org.springframework.hateoas.RepresentationModel`类，用来为模型类提供添加链接的能力。

请求上述接口，能够得到这样的返回：

```json
{
    "id": 814,
    "licenseId": "license0x001",
    "description": "Software product",
    "organizationId": "123456",
    "productName": "Ostock",
    "licenseType": "full",
    "_links": {
        "self": {
            "href": "http://localhost:8080/v1/organization/123456/license/license0x001"
        },
        "createLicense": {
            "href": "http://localhost:8080/v1/organization/123456/license"
        },
        "updateLicense": {
            "href": "http://localhost:8080/v1/organization/123456/license"
        },
        "deleteLicense": {
            "href": "http://localhost:8080/v1/organization/123456/license/license0x001"
        }
    }
}
```

返回体中的`_links`部分，就是HATEOAS为模型添加的链接。

## HAL文档

Spring-HATEOAS使用HAL(Hypertext Application Language)规范来返回模型链接。

因此，上述使用Spring-HATEOAS之后的返回文档的媒体类型（Content-Type）是`application/hal+json`，HAL文档的格式类似于：

```html
   GET /orders/523 HTTP/1.1
   Host: example.org
   Accept: application/hal+json

   HTTP/1.1 200 OK
   Content-Type: application/hal+json

   {
     "_links": {
       "self": { "href": "/orders/523" },
       "warehouse": { "href": "/warehouse/56" },
       "invoice": { "href": "/invoices/873" }
     },
     "currency": "USD",
     "status": "shipped",
     "total": 10.20
   }
```

除了接口的必要返回属性外，HAL还有一些保留属性，如上面的`_links`就是保留属性。

### _links

属性`_links`是可选。它是一个对象，它包含了一个或多个属性，每个属性可以是对象或者数组。

`_links`的每个属性都一个超链接对象，这些对象包含了资源至URL，他们有下列几个属性：

|属性|数据类型|描述|
|:--|:--|:--|
|href| –string| 必填项，它的内容可以是URL 或者URL模板。|
|templated| –bool | 可选项，默认为false，如果href是URL模板则templated必须为true|
|type| –string |可选项，它用来表示资源类型|
|deprecation| –string| 可选项，表示该对象会在未来废弃|
|name| –string| 可选项， 可能当作第二个key，当需要选择拥有相同name的链接时
|profile| –string| 可选项，简要说明链接的内容|
|title| –string| 可选项，用用户可读的语音来描述资源的主题|
|hreflang| –string| 可选项，用来表明资源的语言|

### _embedded

属性`_embedded`是可选的。它是一个对象，它包含了一个或多个属性，每个属性是可以对象或者数组。

以下是一个HAL文档的例子：

```html
   GET /orders HTTP/1.1
   Host: example.org
   Accept: application/hal+json

   HTTP/1.1 200 OK
   Content-Type: application/hal+json

   {
     "_links": {
       "self": { "href": "/orders" },
       "next": { "href": "/orders?page=2" },
       "find": { "href": "/orders{?id}", "templated": true }
     },
     "_embedded": {
       "orders": [{
           "_links": {
             "self": { "href": "/orders/123" },
             "basket": { "href": "/baskets/98712" },
             "customer": { "href": "/customers/7809" }
           },
           "total": 30.00,
           "currency": "USD",
           "status": "shipped",
         },{
           "_links": {
             "self": { "href": "/orders/124" },
             "basket": { "href": "/baskets/97213" },
             "customer": { "href": "/customers/12369" }
           },
           "total": 20.00,
           "currency": "USD",
           "status": "processing"
       }]
     },
     "currentlyProcessing": 14,
     "shippedToday": 20
   }
```

## 参考

[REST HATEOAS入门](https://jozdoo.github.io/rest/2016/09/22/REST-HATEOAS.html)
[rest apis must be hypertext driven](https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven)
[Spring-HATEOAS docs](https://docs.spring.io/spring-hateoas/docs/1.5.4/reference/html/)
