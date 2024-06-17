---
title: "Java接口回调"
date: 2018-10-16
weight: 0
author: "wangy325"

---

# 第一次接触接口回调

回调模式在web开发中用的较多，本文简单介绍了Java的回调机制，理解此文可以在生产中写出适应业务的回调模型。

## 模块之间的调用

在一个应用系统中，必然存在模块之间的调用，调用的方式有几种:

### 1. 同步调用

[![iZXPMQ.md.png](https://s1.ax1x.com/2018/09/18/iZXPMQ.md.png)](https:/imgchr.com/i/iZXPMQ)

​						*方法A()调用方法B(),并且等待方法B()的返回,然后A()再执行下一步操作*



此方法适用于B()方法**执行的时间不长**，如若不然，那么A()方法会长时间等待B()方法执行完成而处于**阻塞**状态，如此，可能会导致整个流程的阻塞。

<!--more-->

### 2. 异步调用

[![iZXAZn.md.png](https://s1.ax1x.com/2018/09/18/iZXAZn.md.png)](https:/imgchr.com/i/iZXAZn)

为了解决A()方法调用B()方法造成流程阻塞而出现的，最典型的方式就是**开启新线程**。这样的话，A()方法不必等待B()方法的返回而**继续执行**。

但是这种方法存在一个问题：如果A()需要知道B()的执行结果(根据业务需求，有些操作如异步线程刷新缓存、推送通知等等不需要，而有些如更改状态的操作则需要)，则需要通过某种方式对B()的执行结果进行**监听**，在Java中可以通过[Future+Callable](http://www.cnblogs.com/xrq730/p/4872722.html)来实现。

### 3. 回调

[![iZXmGT.md.png](https://s1.ax1x.com/2018/09/18/iZXmGT.md.png)](https:/imgchr.com/i/iZXmGT)

在回调模式中，
>A()方法调用B()方法     
>B()方法执行完毕之后，调用A类的AA()方法（回调方法），将执行结果返回给A

要实现这个需求，有几点问题需要思考：
- A类中如何调用B类的方法（这个简单，字段注入即可）
- B类的方法执行完成之后，如何调用A类的callback方法（被调用的B类的方法，必须有A类对象作为形参）
- 如何提升代码的可复用性及可扩展性？（面向接口）

#### 一个简单的例子：

    场景描述：男孩需要向女孩表白，但羞于表达，只好借助神父传达心意，神父知道男孩的请求之后，将要对女孩说的话告诉男孩。

```java
/**
 * @author:wangy
 * @date: 2018/8/30 / 20:37
 * @description: 这是那个男孩
 * java 回调机制的引入  A--调用-->B(c) ---调用-->A(d) d 方法称之为回调方法
 * 使用场景: A想完成某事, 但A不能独立完成,需要借助B的力量, B完成之后, 要将结果通知给A(通过调用A的方法实现)
 */
public class Kidd {
    private String name;
    private GodFather godFather;

    public Kidd(String name,GodFather godFather) {
        this.name = name;
        this.godFather = godFather;
    }

    public void askGodFather(){
        godFather.witness(this);
    }
    public void confess(String voice){
        System.out.println(this.name+":"+ voice);
    }
}
```
**男孩类**有两个方法：
> `askGodFather()` 方法用于调用**神父类**的`witness()`方法  
> `confess()`方法用于让**神父类**回调

```java
/**
 * @author:wangy
 * @date: 2018/8/30 / 20:45
 * @description: 这是神父类
 */
public class GodFather {

    public void witness(Kidd kidd) {
       kidd.confess("the moon light is gorgeous tonight");
    }
}
```
**神父类**比较简单,只有一个方法`witness()`，它有一个`Kidd`对象作为形参,这个对象用于回调**男孩类**的回调方法

```java
// 测试类
public class Test {
    public static void main(String[] args) {
        new Kidd("Alex",new GodFather()).askGodFather();
    }
}
```
返回:

     Alex:the moon light is gorgeous tonight

以上是一个最简单的**Java 回调机制**的模型，该模型还存在一些不限于以下列出的问题：
- B类的方法形参单一，上例中形参为`Kidd`对象，那么，换成`Cat`对象便又要写一个“神父类”；
- 同理，A类调用的B类方法单一，上例中需求的是“表白神父”*（功能A），如果换成“免灾神父”（功能B），又要写一个神父；
- 总结起来，就是通过‘类’的方式实现回调，代码的扩展性和可复用性较差

#### 一个相对健壮的回调机制应该是这样的

![iZOfV1.png](https://s1.ax1x.com/2018/09/18/iZOfV1.png)

以上的UML图解释了Java回调的实质：
> A类和B类分别为接口的实现类，这样代码的扩展性一下就提升了

#### 另一个简单的例子：

    场景描述:老师课堂点名学生回答问题，学生解答完毕之后回答老师

回调接口(A类需实现):    
```java
/**
 * @author wangy
 * @desc 先定义一个回调接口,所有的A类要实现结果回调,必需实现该类并覆写回调方法,供B类调用
 */
public interface Callback {
    /**
     * 回调接口是供B类来调用的,所以它的形参中必须包含A类调用B方法时候的返回值(对象)
     * @param a B类方法的返回值
     * @param student 根据功能需求传递其他参数
     */
    void tellAnswer(Student student , int  a);
}
```

B类的接口:
```java
/**
 * @author wangy
 * @desc B 类, 抽象为一个接口,方便A类对不同实现类(不同功能需求)的回调
 */
public interface Student {
    /**
     * 方法接收一个callback参数,用于指示B类执行方法之后,向谁"汇报"
     * @param callback
     */
    void resolveAnswer(Callback callback);

    String getName();
}
```
A类实体:
```java
/**
 * @author:wangy
 * @date: 2018/9/18 / 10:17
 * @description: A类, 实现回调接口并覆写方法
 */
public class Teacher implements Callback {
    /**
     * 接口作为属性字段,便于扩展
     */
    private Student student;

    public Teacher(Student student) {
        this.student = student;
    }

    /**
     * askQuestion() 方法用于调用B类的方法
     */
    public void askQuestion() {
        student.resolveAnswer(this);
    }

    /**
     * 覆写的回调方法,用于供B类调用,以便通知执行结果
     *
     * @param a
     */
    @Override
    public void tellAnswer(Student student , int a) {
        System.out.println("嗯,"+student.getName()+" 完成任务花了 " + a + " 秒");
    }
}
```
A类实体有2个方法
> `askQuestion()` 用于调用B类的方法     
> 覆写的`tellAnswer()`方法,用于接收回调结果

B类实体:
```java
/**
 * @author:wangy
 * @version:1.0
 * @date: 2018/9/18 / 10:20
 * @description: B类的(某种特殊功能)实现类
 */
public class Rookie implements Student {
    private String name;

    public Rookie(String name) {
        this.name = name;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public void resolveAnswer(Callback callback) {
        // 模拟方法执行过程
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        // 回调,给指定callback的实现类
        callback.tellAnswer(this, 3);
    }
}
```
B类实体有一个方法`resolveAnswer(Callback callback)`，接收一个callback参数，该参数用于调用A类的回调方法

测试类:
```java
public class Test {

    public static void main(String[] args) {
        Teacher teacher = new Teacher(new Rookie("alan"));
        teacher.askQuestion();
    }
}
```
返回:

    嗯,alan 完成任务花了 3 秒

#### 分析

上面的例子中，对A类和B类分别进行了抽象，这样做的好处就是：
1. 抽象了A类之后，对于B类来说，不必要关心是“哪位老师”叫B类完成任务，只需要完成任务就好了，也就是说我B类的方法，可以复用；
2. 抽象了B类之后，对于A类来说，相对更加灵活，其调用B类的方法不仅仅只限于“one-by-one”这种模式，而是一次可以对“多个学生”进行提问，只需要将A类中的字段修改为List<Student>即可。
[回调的核心就是**回调方将本身即this传递给调用方，调用方接着调用回调方的方法告诉它想要知道的信息**。回调是一种思想、是一种机制，至于具体如何实现，如何通过代码将回调实现得优雅、实现得可扩展性比较高，一看开发者的个人水平，二看开发者对业务的理解程度。](https://www.cnblogs.com/xrq730/p/6424471.html)

#### 同步回调与异步回调

上述的例子是一个典型的**同步回调**的示例。同步回调顾名思义就是A()调用B()之后，等待B()执行完成并且调用A()的回调函数，程序再继续执行。

异步回调就是在A()调用B()的过程中，开启一个新线程，不等待B()方法执行完成并回调之后再执行后续操作。

修改上例子中的A类中的方法，将其修改为**异步回调**

```java
public class Teacher implements Callback {
    /**
     * 接口作为属性字段,便于扩展
     */
    private Student student;

    public Teacher(Student student) {
        this.student = student;
    }

    /**
     * askQuestion() 方法用于调用B类的方法
     */
    public void askQuestion() {
        // 异步回调
        new Thread(new Runnable() {
            @Override
            public void run() {
                student.resolveAnswer(Teacher.this);
            }
        }).start();
    }

    @Override
    public void tellAnswer(Student student , int a) {
        System.out.println("知道了,"+student.getName()+" 完成任务花了 " + a + " 秒");
    }
}
```
同步回调和异步回调的选择要结合具体的业务场景，比如充值服务，要将充值的结果返回给用户，调用充值服务之后必须要等待充值接口的返回；但是如果是批量的处理（如退订业务），这时候可以用异步回调，主程序完成之后（或者页面app先返回数据给用户），后台业务逻辑继续执行，最后才业务执行的结果，可以作异步处理；
