---
title: "工厂模式"
date: 2024-03-26
weight: 2
categories: [设计模式]
author: "wangy325"
---


### 工厂模式

- by Head First 设计模式
  > 工厂方法模式定义了一个创建对象的接口，但是由子类决定要创建的对象是哪一个。工厂方法把类的实例化推迟到
  > 子类。

- by Dive into Design Patterns
  > **Factory Method** is a creational design pattern that provides an interface for creating
  > objects in a superclass, but allows subclasses to alter the type of objects that will be
  > created.

> 工厂模式指定工厂仅仅能创建特定类型的产品。

<!--more-->

#### 设计原则

工厂方法很简单，实际上就是抽取客户中实例化对象的代码，利用"对象工厂"来进行实例化。这样做有几个明显的好处：

1. 降低耦合：创建对象的过程和具体的业务解耦。
2. 基本上满足开-闭原则：如果使用工厂，创建对象的逻辑变动或者所需要创建对象变动对客户的代码影响不大。
3. 满足**依赖倒置原则**：
   - 依赖抽象而不是依赖具体实现类。不管是高层组件（接口）还是低层组件（对象），都应该依赖抽象。
      高层组件不应该直接依赖具体的对象。
   - [依赖倒置原则-维基百科](https://zh.wikipedia.org/zh-cn/%E4%BE%9D%E8%B5%96%E5%8F%8D%E8%BD%AC%E5%8E%9F%E5%88%99)

#### UML简图

{{< mermaid >}}
classDiagram

class Product {
  << Interface >>
  +method1()
  +method2()
}
Product ..> ProductCreater
class ProductCreater {
  << Abstract >>
  +factoryMethod() Product
  +otherMethod()
}

ConcreateProductA ..|> Product
class ConcreateProductA {
  +methodA()
  +methodB()
}

ConcreateProductB ..|> Product
class ConcreateProductB {
  +methodA()
  +methodB()
}

ProductACreater --|> ProductCreater
class ProductACreater {
  +factoryMethod() Product
  +otherMethod()
}

ProductBCreater --|> ProductCreater
class ProductBCreater {
  +factoryMethod() Product
  +otherMethod()
}
{{< /mermaid >}}

```mermaid
classDiagram

class Product {
  <<Interface>>
  +method1()
  +method2()
}
Product ..> ProductCreater
class ProductCreater {
  <<Abstract>>
  +factoryMethod() Product
  +otherMethod()
}

ConcreateProductA ..|> Product
class ConcreateProductA {
  +methodA()
  +methodB()
}

ConcreateProductB ..|> Product
class ConcreateProductB {
  +methodA()
  +methodB()
}

ProductACreater --|> ProductCreater
class ProductACreater {
  +factoryMethod() Product
  +otherMethod()
}

ProductBCreater --|> ProductCreater
class ProductBCreater {
  +factoryMethod() Product
  +otherMethod()
}
```

#### 示例代码

> Generated by gpt4o

```java
// 产品接口
interface Shape {
    void draw();
}

// 具体产品类
class Circle implements Shape {
    @Override
    public void draw() {
        System.out.println("Drawing a Circle");
    }
}

class Square implements Shape {
    @Override
    public void draw() {
        System.out.println("Drawing a Square");
    }
}

class Rectangle implements Shape {
    @Override
    public void draw() {
        System.out.println("Drawing a Rectangle");
    }
}

// 工厂类
class ShapeFactory {
    // 使用 getShape 方法获取形状类型的对象
    public Shape getShape(String shapeType) {
        if (shapeType == null) {
            return null;
        }
        if (shapeType.equalsIgnoreCase("CIRCLE")) {
            return new Circle();
        } else if (shapeType.equalsIgnoreCase("SQUARE")) {
            return new Square();
        } else if (shapeType.equalsIgnoreCase("RECTANGLE")) {
            return new Rectangle();
        }
        return null;
    }
}

// 测试工厂模式
public class FactoryPatternDemo {
    public static void main(String[] args) {
        ShapeFactory shapeFactory = new ShapeFactory();

        // 获取 Circle 对象并调用其 draw 方法
        Shape shape1 = shapeFactory.getShape("CIRCLE");
        shape1.draw();
        // 获取 Square 对象并调用其 draw 方法
        Shape shape2 = shapeFactory.getShape("SQUARE");
        shape2.draw();
        // 获取 Rectangle 对象并调用其 draw 方法
        Shape shape3 = shapeFactory.getShape("RECTANGLE");
        shape3.draw();
    }
}
```

工厂模式的工厂职责相对单一，仅能创建指定对象。

[更多示例代码](https://github.com/wangy325/java-review/blob/d6d740b5a9b5de3f7d64579288b1b8c96c8b8da5/src/main/java/com/wangy/designpattern/creation/factory)

#### 开发建议

[《深入设计模式》中关于工厂模式的介绍](https://refactoringguru.cn/design-patterns/factory-method)
