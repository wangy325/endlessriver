---
title: "Java Script中的构造函数"
date: 2019-07-25
lastmod: 2019-10-21
draft: true
tags: [函数]
categories: [JavaScript]
author: "wangy325"

---


函数作为JavaScript中的一个特殊数据类型（特殊对象的一种，另一种是数组），有一些特性值得思考与讨论。

<!--more-->

### JavaScript中的函数的声明

一般来讲，可以通过3种方式声明函数：

- function关键字
- 函数表达式
- Function构造函数

#### function关键字声明函数

<span id ="1" style= "display: none">
</span>

```js
> function foo(){
    return 'foo';
}
> foo();
< "foo"
```

上述方式为最常见声明函数**（Function Declaration）**的方式，通过`foo()`即可调用函数。

#### 函数表达式声明函数

```js
> var foo = function(){
    return 'foo';
}
> foo();
< "foo"
```

此处，变量`foo`的右侧是一个匿名函数**（Function Expression）**，这是一个函数表达式，因为，等号右边只能是表达式。

若使用函数表达式时，等号右侧不是函数表达式（匿名函数），其实变量也是可以正常使用的：

```js
> var foo = function fo(){
    return fo.name;
}
> foo();
< "fo"
> fo();
< VM771:1 Uncaught ReferenceError: fo is not defined at <anonymous>:1:1
```

但是，若试图调用function关键字后的函数，会得到一个报错信息。同时，需要说明的是，function关键字后面的函数在Function Declaration中是可以使用的。

函数表达式实际上是将函数赋值给变量，*这个变量可以像操作其他js对象一样操作*

#### Function构造函数声明函数

js中亦存在构造函数的概念

```js
> var func = new Function('x','y', 'return x + y');
> func(1,2);
< 3
// 等价于
> var func = function(x,y){return x+y};
```

`new Function()`构造器会将传入的最后一个参数作为函数的返回体，其他的参数均作为函数的参数。这存在一个很大的弊端，就是不利于编写业务逻辑，因此，此法极少使用。

### 将函数看作对象

#### 函数与对象

js中的对象，对象的属性字段可以在对象初始化完成后再进行赋值

```js
> var obj = {};
> obj.name = "jay";
> obj.name;
< "jay"
```

函数作为js中的一个特殊对象，也可以进行类似操作

```js
> var car = function(){};
> car.brand = 'ford';
> car.brand;
< "ford"
```

事实上，如果需要封装一个对象（类）的时候，往往需要为对象封装一些属性，可以利用函数，让代码更优雅。

#### new 运算符

```js
> var foo = function(){};
> var bar = foo();
> var tar = new foo();
> console.log(typeof(foo) + ',' + typeof(bar) + ',' + typeof(tar));
< "function","undefined","object"
```

从结果上来看，foo是function类型；bar是foo函数的返回类型，但是函数表达式没有返回语句，即返回void(undefined)；tar则是对象类型。

> new 运算符创建一个用户定义的对象类型的实例或具有构造函数的内置对象的实例。new 关键字会进行如下的操作：
>
> - 创建一个空的简单JavaScript对象（即`{}`）；
> - 链接该对象（即设置该对象的构造函数）到另一个对象 ；
> - 将步骤1新创建的对象作为this的上下文 ；
> - 如果该函数没有返回对象，则返回this。

如此一来，上例中的`tar`对象就是一个空的JsavaScript对象

```js
> tar;
< {}
```
