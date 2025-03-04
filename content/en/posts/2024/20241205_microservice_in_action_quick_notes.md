---
title: "Quick notes of microservice in action"
date: 2024-12-05
author: wangy325
categories:
tags: [spring cloud]
---


This is quick notes of learning Spring microservice in action(2nd edition). To be clarified, Spring-Boot and Spring-Cloud version are little different from book.

Here are versions used:

- Spring-Boot version `2.6.13`
- Spring-Cloud version `2021.0.5`

<!--more-->

Whereas the guide book `Spring Microservice In Action(2nd edition)` uses `2.2.3.RELEASE` for spring-boot
and `Hoxton.SR1` for spring-cloud. Which introduces some version 'traps'.

### 1) No spring.config.import property has been defined

While configuring `licensing-service` as **Spring Cloud Config Client**, I encountered this error. After googled,
I found that was a new version of spring with old configuration style.

> You're getting this error because you're using a new version of Spring Boot and Spring Cloud, but you're trying to configure it in the old way.

Here is the full answer link: https://stackoverflow.com/questions/67507452/no-spring-config-import-property-has-been-defined

Spring Boot 2.4(later) introduced a new way to import config data.

Here is official doc: https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_client

2 solutions were provided to solve problem.

### 2) Spring cloud config Git backend with ssh authentication

Use command

```ssh
ssh-keygen -m PEM -t rsa -b 4096 -f config_server_deploy_key.rsa
```

to gen rsa key pair.

Then config spring cloud config server like this:

```yaml
  spring:
    cloud:
      config:
        server:
          git:
            uri: git@gitserver.com:team/repo1.git
            ignoreLocalSshSettings: true
#            hostKey: someHostKey
#            hostKeyAlgorithm: ssh-rsa
            privateKey: |
                         -----BEGIN RSA PRIVATE KEY-----
                         MIIEpgIBAAKCAQEAx4UbaDzY5xjW6hc9jwN0mX33XpTDVW9WqHp5AKaRbtAC3DqX
                         IXFMPgw3K45jxRb93f8tv9vL3rD9CUG1Gv4FM+o7ds7FRES5RTjv2RT/JVNJCoqF
                         ol8+ngLqRZCyBtQN7zYByWMRirPGoDUqdPYrj2yq+ObBBNhg5N+hOwKjjpzdj2Ud
                         1l7R+wxIqmJo1IYyy16xS8WsjyQuyC0lL456qkd5BDZ0Ag8j2X9H9D5220Ln7s9i
                         oezTipXipS7p7Jekf3Ywx6abJwOmB0rX79dV4qiNcGgzATnG1PkXxqt76VhcGa0W
                         DDVHEEYGbSQ6hIGSh0I7BQun0aLRZojfE3gqHQIDAQABAoIBAQCZmGrk8BK6tXCd
                         fY6yTiKxFzwb38IQP0ojIUWNrq0+9Xt+NsypviLHkXfXXCKKU4zUHeIGVRq5MN9b
                         BO56/RrcQHHOoJdUWuOV2qMqJvPUtC0CpGkD+valhfD75MxoXU7s3FK7yjxy3rsG
                         EmfA6tHV8/4a5umo5TqSd2YTm5B19AhRqiuUVI1wTB41DjULUGiMYrnYrhzQlVvj
                         5MjnKTlYu3V8PoYDfv1GmxPPh6vlpafXEeEYN8VB97e5x3DGHjZ5UrurAmTLTdO8
                         +AahyoKsIY612TkkQthJlt7FJAwnCGMgY6podzzvzICLFmmTXYiZ/28I4BX/mOSe
                         pZVnfRixAoGBAO6Uiwt40/PKs53mCEWngslSCsh9oGAaLTf/XdvMns5VmuyyAyKG
                         ti8Ol5wqBMi4GIUzjbgUvSUt+IowIrG3f5tN85wpjQ1UGVcpTnl5Qo9xaS1PFScQ
                         xrtWZ9eNj2TsIAMp/svJsyGG3OibxfnuAIpSXNQiJPwRlW3irzpGgVx/AoGBANYW
                         dnhshUcEHMJi3aXwR12OTDnaLoanVGLwLnkqLSYUZA7ZegpKq90UAuBdcEfgdpyi
                         PhKpeaeIiAaNnFo8m9aoTKr+7I6/uMTlwrVnfrsVTZv3orxjwQV20YIBCVRKD1uX
                         VhE0ozPZxwwKSPAFocpyWpGHGreGF1AIYBE9UBtjAoGBAI8bfPgJpyFyMiGBjO6z
                         FwlJc/xlFqDusrcHL7abW5qq0L4v3R+FrJw3ZYufzLTVcKfdj6GelwJJO+8wBm+R
                         gTKYJItEhT48duLIfTDyIpHGVm9+I1MGhh5zKuCqIhxIYr9jHloBB7kRm0rPvYY4
                         VAykcNgyDvtAVODP+4m6JvhjAoGBALbtTqErKN47V0+JJpapLnF0KxGrqeGIjIRV
                         cYA6V4WYGr7NeIfesecfOC356PyhgPfpcVyEztwlvwTKb3RzIT1TZN8fH4YBr6Ee
                         KTbTjefRFhVUjQqnucAvfGi29f+9oE3Ei9f7wA+H35ocF6JvTYUsHNMIO/3gZ38N
                         CPjyCMa9AoGBAMhsITNe3QcbsXAbdUR00dDsIFVROzyFJ2m40i4KCRM35bC/BIBs
                         q0TY3we+ERB40U8Z2BvU61QuwaunJ2+uGadHo58VSVdggqAo0BSkH58innKKt96J
                         69pcVH/4rmLbXdcmNYGm6iu+MlPQk4BUZknHSmVHIFdJ0EPupVaQ8RHT
                         -----END RSA PRIVATE KEY-----

```

Note: `hostKey` and `hostkeyAlgorithm` are no necessary configuration items.

Do Not forget to add public key to your gitHub settings.

>By the way, if you already have an ssh key-pair in your local machine, just use it!

Referring official guide to learn more about git backend: https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server

### 3) Config sensitive info as env variables in Docker Compose

Use System Environment Variable.

```shell
docker compose run -e KEY_OF_ENV=value web python app.py
```

### 4) Debug Micro Service locally with docker and IDEA

Docker services:

- config server
- eureka server
- database

IDEA services: 

- licensing service
- organization service 

IDEA services need some extra configurations(program arguments) to 
override config server's backend configuration.

Use `--key=value` to do that.

```shell
--eureka.client.serviceUrl.defaultZone=http://localhost:8070/eureka
--spring.datasource.url=jdbc:postgresql://localhost:5432/ostock_dev
--spring.config.import=optional:configserver:http://localhost:8071
```

### 5) Spring-Cloud discovery client and loadbalancer

After introducing eureka client to licensing service, we also introduced `spring-cloud-starter-loadbalancer` 
and `spring-cloud-starter-openfeign`, which provide load-balance and microservice remote invoking ability to licensing service.

There 3 ways to achieve remote call, introduced by the book(microservice in action).

- DiscoveryClient (Without load balance)
- RestTemplate
- OpenFeign

#### 5.1 DiscoveryClient (Not recommended)

To Use `DiscoveryClient` in Spring Cloud, just inject `DiscoveryClient` bean into services.

```java
@Component
public class OrganizationDiscoveryClient {
    @Autowired
    private DiscoveryClient discoveryClient;

    /**
     * No LoadBalanced
     */
    public Organization getOrganization(String organizationId) {
        RestTemplate restTemplate = new RestTemplate();
        List<ServiceInstance> instances = discoveryClient.getInstances("organization-service");

        if (instances.isEmpty()) return null;
        String serviceUri = String.format("%s/v1/organization/%s",instances.get(0).getUri().toString(), organizationId);

        ResponseEntity< Organization > restExchange =
            restTemplate.exchange(
                serviceUri,
                HttpMethod.GET,
                null, Organization.class, organizationId);

        return restExchange.getBody();
    }
}
```

`DiscoveryClient` actually get all service instances by service name you set in eureka client.
The service name was set by `spring.application,name` property. 

And you could find out that `DiscoveryClient` was used to get remote service's url, and service was invoked by `RestTemplate`.

As you can see, there are still some 'hard code' in there, and `DiscoveryClient` always get the first service's url, which means
Spring Cloud load-balance did not work in this scenario. 

#### 5.2 RestTemplate with `@LoadBalanced`

If you want your `RestTemplate` run as load-balanced client, you need to config it with `@LoadBalanced`.

```java
@LoadBalanced
@Bean
public RestTemplate getRestTemplate(){
    return new RestTemplate();
}
```

Then you can use `RestTemplate` like this: 

```java
@Component
public class OrganizationRestTemplateClient {

    @Autowired
    RestTemplate restTemplate;

    public Organization getOrganization(String organizationId){
        ResponseEntity<Organization> restExchange =
            restTemplate.exchange(
                "http://organization-service/v1/organization/{organizationId}",
                HttpMethod.GET,
                null, Organization.class, organizationId);

        return restExchange.getBody();
    }
}
```

If you have more than 1 instances of organization service, the `RestTemplate` will query each instances Round-Robbin.

#### 5.3 OpenFeign

>Spring Cloud integrates Eureka, Spring Cloud CircuitBreaker, as well as Spring Cloud LoadBalancer to provide a
>load-balanced http client when using Feign.

By using OpenFeign integrated with Spring Cloud, it already supported a load-balanced http-client.

The way to use `OpenFeign` is simple:

```java
@FeignClient("organization-service")
public interface OrganizationFeignClient {

    @RequestMapping(
        method= RequestMethod.GET,
        value="/v1/organization/{organizationId}",
        consumes="application/json")
    Organization getOrganization(@PathVariable("organizationId") String organizationId);
}
```

Do not forget to annotate Main-class with `@EnableFeignClients`.

#### 5.4 Other approaches

Except ways mentioned above, there are other approaches to achieve RPC in Spring of course.

Spring WebFlux is a alternative:

- [WebClient](https://docs.spring.io/spring-cloud-commons/docs/3.1.8/reference/html/#webclinet-loadbalancer-client)
- [WebFlux WebClient](https://docs.spring.io/spring-cloud-commons/docs/3.1.8/reference/html/#webflux-with-reactive-loadbalancer)

More information, read:

- https://docs.spring.io/spring-cloud-commons/docs/3.1.8/reference/html/#spring-cloud-loadbalancer
- https://docs.spring.io/spring-cloud-openfeign/docs/3.1.9/reference/html/

##### Using a ReactiveLoadBalanced WebClients

Filter `UserContextFunctionFilter` uses to transmit correlationId and other HTTP Headers like JWT while micro service invoking.

```java
@Autowired
ReactorLoadBalancerExchangeFilterFunction lbFunction;
/**
 * {@link WebClient} load balancer HTTP client
 */
@Bean
@LoadBalanced
public WebClient.Builder getWebclient() {
    return WebClient.builder().filters(f -> {
       f.add(new UserContextFunctionFilter());
       f.add(lbFunction);
    });
}
```

And the `UserContextFunctionFilter` looks like: 

```java
public class UserContextFunctionFilter implements ExchangeFilterFunction {
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

There is a warning info by spring BeanPostProcessorAutoConfiguration:

```cmd
2024-12-17 08:29:57.580  INFO 1 --- [           main] trationDelegate$BeanPostProcessorChecker :Bean 'org.springframework.cloud.client.loadbalancer.reactive.LoadBalancerBeanPostProcessorAutoConfiguration' of type [org.springframework.cloud.client.loadbalancer.reactive.LoadBalancerBeanPostProcessorAutoConfiguration] is not eligible for getting processed by all BeanPostProcessors (for example: not eligible for auto-proxying)
2024-12-17 08:29:57.594  INFO 1 --- [           main] trationDelegate$BeanPostProcessorChecker : Bean 'org.springframework.cloud.client.loadbalancer.reactive.LoadBalancerBeanPostProcessorAutoConfiguration$ReactorDeferringLoadBalancerFilterConfig' of type [org.springframework.cloud.client.loadbalancer.reactive.LoadBalancerBeanPostProcessorAutoConfiguration$ReactorDeferringLoadBalancerFilterConfig] is not eligible for getting processed by all BeanPostProcessors (for example: not eligible for auto-proxying)
2024-12-17 08:29:57.605  INFO 1 --- [           main] trationDelegate$BeanPostProcessorChecker : Bean 'reactorDeferringLoadBalancerExchangeFilterFunction' of type [org.springframework.cloud.client.loadbalancer.reactive.DeferringLoadBalancerExchangeFilterFunction] is not eligible for getting processed by all BeanPostProcessors (for example: not eligible for auto-proxying)
```

This `...is not eligible for getting processed by all BeanPostProcessors` info always causes by [circle dependency](https://www.baeldung.com/spring-not-eligible-for-auto-proxying).

This info Spring Cloud did not fix it officially yet.

- https://stackoverflow.com/questions/73782826/loadbalancerbeanpostprocessorautoconfiguration-is-not-eligible-for-getting-pro
- https://github.com/spring-cloud/spring-cloud-commons/pull/1361
