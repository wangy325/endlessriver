---
title: "Spring WebClient实现微服务的负载均衡调用"
date: 2024-12-19
author: wangy325
BookToC: true
categories: []
tags: [spring]
---

在微服务应用中，负载均衡来保证应用的可用性的常用手段。`Spring-Cloud-LoadBalancer`提供了服务之间实现负载均衡调用的能力。

除了使用[Open-Feign](https://docs.spring.io/spring-cloud-openfeign/docs/3.1.9/reference/html/#spring-cloud-feign)外，还可以使用`RestTemplate`和`WebClint`进行服务调用。


`WebClient`是[Spring WebFlux](https://docs.spring.io/spring-framework/reference/web/webflux-webclient.html)项目下的HTTP工具，基于Reactor的非阻塞流式API，是`RestTemplate`的有效替代。

<!--more-->

## Spring Cloud 负载均衡

Spring Cloud提供了客户端负载均衡的抽象和实现。如果你的微服务引入了`spring-cloud-starter-loadbalancer`包，并且没有在配置文件中使用`spring.cloud.loadbalancer.enabled = false`禁用负载均衡，那么Spring Cloud负载均衡的必需项会在应用启动后自动配置。

默认情况下，Spring Cloud LoadBalancer会实现`ReactiveLoadBalancer`接口，这个接口基于轮询（Round-Robin）来随机访问微服务实例。而微服务示例由谁来提供呢？

很明显，自然是由[服务发现](https://docs.spring.io/spring-cloud-commons/docs/current/reference/html/#discovery-client)来提供。

那么，服务发现与负载均衡之间沟通的桥梁是什么？这就不得不提`ServiceInstanceListSupplier`这个接口了，这个接口使服务发现客户端通过`service-id`获取服务实例。


`ServiceInstanceListSupplier`接口提供了`builder()`方法来创建实例。

```java
public interface ServiceInstanceListSupplier extends Supplier<Flux<List<ServiceInstance>>> {

	String getServiceId();

	default Flux<List<ServiceInstance>> get(Request request) {
		return get();
	}

	static ServiceInstanceListSupplierBuilder builder() {
		return new ServiceInstanceListSupplierBuilder();
	}

}
```

默认情况下，如果微服务引入了`spring-boot-starter-webflux`（当然啦，都使用`WebClient`了），Spring Cloud会自动配置`ReactiveCompositeDiscoveryClient`这个服务发现客户端：

```java { hl_lines=[6] }
public class ReactiveCompositeDiscoveryClientAutoConfiguration {

	@Bean
	@Primary
	public ReactiveCompositeDiscoveryClient reactiveCompositeDiscoveryClient(
			List<ReactiveDiscoveryClient> discoveryClients) {
		return new ReactiveCompositeDiscoveryClient(discoveryClients);
	}

}
```

如果使用Eureka作为服务发现实现，那么上述配置所使用的形参`discoveryClients`则通过

```java
public class EurekaReactiveDiscoveryClientConfiguration {

	@Bean
	@ConditionalOnMissingBean
	public EurekaReactiveDiscoveryClient eurekaReactiveDiscoveryClient(EurekaClient client,
			EurekaClientConfig clientConfig) {
		return new EurekaReactiveDiscoveryClient(client, clientConfig);
	}
    // 以下省略...
}
```

同样地，配置依赖的`EurekaClient`和`EurekaClientConfig`也是自动配置，这里不在展开讨论。

有了服务发现，还需要配置负载均衡，Spring默认情况下也进行了自动配置。

首先是通过 `LoadBalancerAutoConfiguration`配置负载均衡客户端工厂`LoadBalancerClientFactory`：

```java { hl_lines=[5] }
// org.springframework.cloud.loadbalancer.config.LoadBalancerAutoConfiguration
@ConditionalOnMissingBean
@Bean
public LoadBalancerClientFactory loadBalancerClientFactory(LoadBalancerClientsProperties properties) {
    LoadBalancerClientFactory clientFactory = new LoadBalancerClientFactory(properties);
    clientFactory.setConfigurations(this.configurations.getIfAvailable(Collections::emptyList));
    return clientFactory;
}
```

而负载均衡的客户端则是在`LoadBalancerClientConfiguration`类中进行配置：

```java { hl_lines=[7, 17] }
// org.springframework.cloud.loadbalancer.annotation.LoadBalancerClientConfiguration
@Bean
@ConditionalOnMissingBean
public ReactorLoadBalancer<ServiceInstance> reactorServiceInstanceLoadBalancer(Environment environment,
        LoadBalancerClientFactory loadBalancerClientFactory) {
    String name = environment.getProperty(LoadBalancerClientFactory.PROPERTY_NAME);
    return new RoundRobinLoadBalancer(
            loadBalancerClientFactory.getLazyProvider(name, ServiceInstanceListSupplier.class), name);
}

@Bean
@ConditionalOnBean(ReactiveDiscoveryClient.class)
@ConditionalOnMissingBean
@Conditional(DefaultConfigurationCondition.class)
public ServiceInstanceListSupplier discoveryClientServiceInstanceListSupplier(
        ConfigurableApplicationContext context) {
    return ServiceInstanceListSupplier.builder().withDiscoveryClient().withCaching().build(context);
}

// 以下省略...
```

默认情况下，Spring-Cloud使用`RoundRobinLoadBalancer`进行服务轮询。同时，还配置了`ServiceInstanceListSupplier`，使用了基础的发现客户端和缓存。

```java
// org.springframework.cloud.loadbalancer.core.ServiceInstanceListSupplierBuilder
public ServiceInstanceListSupplierBuilder withDiscoveryClient() {
    if (baseCreator != null && LOG.isWarnEnabled()) {
        LOG.warn("Overriding a previously set baseCreator with a ReactiveDiscoveryClient baseCreator.");
    }
    this.baseCreator = context -> {
        ReactiveDiscoveryClient discoveryClient = context.getBean(ReactiveDiscoveryClient.class);

        return new DiscoveryClientServiceInstanceListSupplier(discoveryClient, context.getEnvironment());
    };
    return this;
}

public ServiceInstanceListSupplierBuilder withCaching() {
    if (cachingCreator != null && LOG.isWarnEnabled()) {
        LOG.warn(
                "Overriding a previously set cachingCreator with a CachingServiceInstanceListSupplier-based cachingCreator.");
    }
    this.cachingCreator = (context, delegate) -> {
        ObjectProvider<LoadBalancerCacheManager> cacheManagerProvider = context
                .getBeanProvider(LoadBalancerCacheManager.class);
        if (cacheManagerProvider.getIfAvailable() != null) {
            return new CachingServiceInstanceListSupplier(delegate, cacheManagerProvider.getIfAvailable());
        }
        if (LOG.isWarnEnabled()) {
            LOG.warn("LoadBalancerCacheManager not available, returning delegate without caching.");
        }
        return delegate;
    };
    return this;
}
```

## WebClient作为负载均衡客户端

使用`WebClient`作为负载均衡客户端非常简单，只需要使用`@LoadBalanced`注解即可：

```java
@Configuration
public class MyConfiguration {

    @Bean
    @LoadBalanced
    public WebClient.Builder loadBalancedWebClientBuilder() {
        return WebClient.builder();
    }
}

public class MyClass {
    @Autowired
    private WebClient.Builder webClientBuilder;

    public Mono<String> doOtherStuff() {
        return webClientBuilder.build().get().uri("http://stores/stores")
                        .retrieve().bodyToMono(String.class);
    }
}
```

需要注意的是，在使用负载均衡后，`WebClient`发起调用的`uri`必需使用注册中心的服务名，而**不能**使用`host:port`的组合了。

上文已经提到，默认情况下，引入`spring-cloud-starter-loadbalancer`包后，Spring Cloud Load Balancer已经开始工作，`ReactiveLoadBalancer`已经自动配置并且在工作了。

通常，在微服务调用时，还需要处理请求之间头的传递问题。这需要在请求中加入一个过滤器，用来处理这个问题。

在`WebClient`请求中加入过滤器添加请求头信息也很容易，只需要实现`ExchangeFilterFunction`接口：

```java { hl_lines=["5-6"] }
public class UserContextWebClientFilter implements ExchangeFilterFunction {
    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        ClientRequest buildRequest = ClientRequest.from(request).headers(h -> {
            h.add(UserContext.CORRELATION_ID, UserContextHolder.getContext().getCorrelationId());
            h.add(UserContext.AUTH_TOKEN, UserContextHolder.getContext().getAuthToken());
        }).build();
        return next.exchange(buildRequest);
    }
}
```

然后在配置`WebClient`时，添加过滤器即可：

```java
@Configuration
public class WebClientLoadBalancerConfiguration {

    @Bean
    @LoadBalanced
    public WebClient.Builder loadBalancedWebClient() {
        return WebClient.builder()
            .filters(
                f -> {
                    f.add(new UserContextWebClientFilter());
                });
    }
}
```


## 自定义负载均衡配置

上文提到，默认情况下，Spring-Cloud会自动配置`RoundRobinLoadBalancer`和`ServiceInstanceListSupplier`，如果想自定义负载均衡配置，可以手动配置这两个类。

### 使用`RamdomLoadBalancer`而非`RoundRobinLoadBalancer`

```java {hl_lines=[5]}
public class CustomLoadBalancerConfiguration {

    @Bean
    ReactorLoadBalancer<ServiceInstance> randomLoadBalancer(Environment environment,
            LoadBalancerClientFactory loadBalancerClientFactory) {
        String name = environment.getProperty(LoadBalancerClientFactory.PROPERTY_NAME);
        return new RandomLoadBalancer(loadBalancerClientFactory
                .getLazyProvider(name, ServiceInstanceListSupplier.class),
                name);
    }
}
```

`LoadBalancerClientFactory`前文提过，是通过`LoadBalancerAutoConfiguration`自动配置的。

### 自定义ServiceInstanceListSupplier

除了自定义`RamdomLoadBalancer`外，还可以手动配置`ServiceInstanceListSupplier`：

```java
public class CustomLoadBalancerConfiguration {

    @Bean
    public ServiceInstanceListSupplier discoveryClientServiceInstanceListSupplier(
            ConfigurableApplicationContext context) {
        return ServiceInstanceListSupplier.builder()
                    .withDiscoveryClient()
                    .withHealthChecks()     // 使用健康检查
                    .build(context);
        }
    }
```

### 使用自定义配置

{{< hint info >}}
自定义配置类不能使用`@Configuration`注解。

https://docs.spring.io/spring-cloud-commons/docs/current/reference/html/#custom-loadbalancer-configuration
{{< /hint >}}

要使用手动配置注解，可以使用`@LoadBalancerClient`注解。

```java {hl_lines=[2]}
@Configuration
@LoadBalancerClient(value = "licensing-service", configuration = CustomLoadBalancerConfig.class)
public class WebClientLoadBalancerConfiguration {

    @Bean
    @LoadBalanced
    public WebClient.Builder loadBalancedWebClient() {
        return WebClient.builder()
            .filters(
                filters -> {
                    filters.add(new UserContextWebClientFilter());
                });
    }
}
```

### No servers available for service ***

如上，在使用自定义配置的情况下，若在自定义配置中使用健康检查的情况下，可能会遇到负载均衡无法找到服务的问题：

```java
ServiceInstanceListSupplier.builder()
                    .withDiscoveryClient()
                    .withHealthChecks()     // 使用健康检查
                    .build(context);
```

```cmd
ERROR 88657 --- [nio-8888-exec-1] o.a.c.c.C.[.[.[/].[dispatcherServlet]    : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is org.springframework.web.reactive.function.client.WebClientResponseException$ServiceUnavailable: 503 Service Unavailable from UNKNOWN ] with root cause
WARN 88657 --- [     parallel-5] o.s.c.l.core.RoundRobinLoadBalancer      : No servers available for service: 192.168.1.70
WARN 88657 --- [     parallel-5] eactorLoadBalancerExchangeFilterFunction : LoadBalancer does not contain an instance for the service 192.168.1.70
WARN 88657 --- [     parallel-9] o.s.c.l.core.RoundRobinLoadBalancer      : No servers available for service: 192.168.1.70
WARN 88657 --- [     parallel-9] eactorLoadBalancerExchangeFilterFunction : LoadBalancer does not contain an instance for the service 192.168.1.70
WARN 88657 --- [    parallel-12] o.s.c.l.core.RoundRobinLoadBalancer      : No servers available for service: 192.168.1.70
WARN 88657 --- [    parallel-12] eactorLoadBalancerExchangeFilterFunction : LoadBalancer does not contain an instance for the service 192.168.1.70
```

原因在于，使用同一个`WebClient.Builder`实例同时用来处理请求和发送健康健康检查，因此，`HealthCheckServiceInstanceListSupplier`用来健康检查的的请求是由负载均衡客户端发出的。实际上，健康请求应该是非负载均衡的（因健康检查使用的是host，而不是服务id，从上面的警告日志可看出）。因此，可以初拥独立的非负载均衡的客户端用来健康检查。像这样：

```java
ServiceInstanceListSupplier.builder()
                    .withDiscoveryClient()
                    .withHealthChecks(WebClient.builder().build())     // 使用非负载均衡的健康检查
                    .build(context);
```

另外，还可以通过配置自定义健康检查机制：

```yml
spring: 
  cloud:
    loadbalancer:
      health-check: 
        initial-delay: 1s   # 初始时间间隔： 默认0
        interval: 30s  # 健康检查时间间隔：默认25s
# 或者

spring:
    cloud:
        loadbalancer:
            clients:
                your-service-name: # 或者指定服务名，每个服务名使用不同的配置，未配置的服务名使用默认配置
                    health-check:
                        initial-delay: 5s
                        interval: 30s
```

{{< hint info >}}
关于健康检查机制，在使用服务注册中心的时候，并不需要。因为注册中心会检测微服务的健康状况。

如果是使用简单的服务发现（`SimpleDiscoveryClient`），健康检查是有帮助的。

{{< /hint >}}

### 负载均衡的缓存和统计数据

除了健康检查机制外，还可以配置负载均衡的缓存和负载均衡的统计数据：

```yml
spring: 
  cloud:
    loadbalancer:
      cache: # 使用caffine缓存
        caffeine:
          spec: initialCapacity=10, maximumSize=50 # initialCapacity默认256
        ttl: 30s # 默认35s
      stats:  # 负载均衡statistics
        micrometer: 
          enabled: true
```

默认情况下，负载均衡使用内存作为服务缓存。如果项目引入了`caffeine`，Spring-Cloud Load Balancer会使用`caffeine`作为服务缓存。

当然，可以通过设置`spring.cloud.loadbalancer.cache.enabled`为`false`禁用缓存。

此外，还可以通过设置`spring.cloud.loadbalancer.stats.micrometer.enabled`为`true`来查看负载均衡的调用情况。它通过`actuator`注册了几个`metrics`：

- `loadbalancer.requests.active`: 任意微服务实例当前活动的请求；

- `loadbalancer.requests.success`: 负载均衡成功的请求数；

- `loadbalancer.requests.failed`: 负载均衡因异常失败的请求数；

- `loadbalancer.requests.discard`: 负载均衡丢弃的请求数；


以上，是本文关于Spring-Cloud LoadBalancer 的简单使用过程中遇到的几个小问题。

还有一些可自定义的配置还未实践，包括Zone-Based LoadBalancer，Sticky Session LoadBalancer，Hints等等。


## References

- [Spring Cloud Load Balancer](https://docs.spring.io/spring-cloud-commons/docs/current/reference/html/#spring-cloud-loadbalancer)
- [Spring WebClient as a Load Balancer Client](https://docs.spring.io/spring-cloud-commons/docs/current/reference/html/#webclinet-loadbalancer-client)
- [Spring WebFlux WebClient as a Load Balancer Client](https://docs.spring.io/spring-cloud-commons/docs/current/reference/html/#loadbalanced-webclient)
- [Load Balancer: No servers available for service ***](https://stackoverflow.com/questions/68153309/spring-webclient-load-balance)
- [Configuring spring-cloud loadbalancer without autoconfiguration?](https://stackoverflow.com/questions/66534708/configuring-spring-cloud-loadbalancer-without-autoconfiguration)
- [Load-balancer-does-not-contain-an-instance-for-the-service](https://stackoverflow.com/questions/67953892/load-balancer-does-not-contain-an-instance-for-the-service)
- [Caffeine specs](https://www.javadoc.io/doc/com.github.ben-manes.caffeine/caffeine/2.2.2/com/github/benmanes/caffeine/cache/CaffeineSpec.html)



