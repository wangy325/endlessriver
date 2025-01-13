---
title: "How does Spring Security prevent application from CSRF?"
date: 2025-01-10
author: wangy325
categories: []
tags: [spring, spring-security]
---

## Question

When I wrote a Spring Security & Oauth2 web application according to [this official guide](https://spring.io/guides/tutorials/spring-boot-oauth2#header) with `Spring Boot 3.0.6` and `Spring Security 6.0.3`, I encountered a problem when I configured Spring Security CSRF:

```java
@Override
protected void configure(HttpSecurity http) throws Exception {
	// @formatter:off
    http
        // ... existing code here
        .csrf(c -> c
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
        )
        // ... existing code here
    // @formatter:on
}
```

<!--more-->

Logs below shows the error info:

```cmd
o.s.security.web.csrf.CsrfFilter: Invalid CSRF token found for http://localhost:8080/logout
o.s.s.w.access.AccessDeniedHandlerImpl: Responding with 403 status code
```

{{< hint info >}}
`CookieCsrfRepository` is a implementation of `CsrfTokenRepository`, Which persists the CSRF token in a cookie named "XSRF-TOKEN" and reads from the header "X-XSRF-TOKEN" following the conventions of AngularJS. When using with AngularJS be sure to use `withHttpOnlyFalse()`.

So what does attribute `HttpOnly` mean?  This is an attribute of [Cookie](https://docs.oracle.com/javaee/7/api/javax/servlet/http/Cookie.html#setHttpOnly-boolean-), once `HttpOnly` is set to true(*default value*), the cookie will be hidden from scripts on the client side.

So, we need to set `HttpOnly` to false on behalf of JS's Cookie visibility.
{{< /hint >}}


## Debug

I debugged and found that Spring Security 6 uses `XorCsrfTokenRequestAttributeHandler` to  provides [BREACH protection](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html#csrf-token-request-handler-breach) of the CsrfToken by default.

```java
// XorCsrfTokenRequestAttributeHandler.getTokenValue
private static String getTokenValue(String actualToken, String token) {
    byte[] actualBytes;
    try {
        actualBytes = Base64.getUrlDecoder().decode(actualToken);
    }
    catch (Exception ex) {
        return null;
    }

    byte[] tokenBytes = Utf8.encode(token);
    int tokenSize = tokenBytes.length;
    if (actualBytes.length < tokenSize) {
        // return null here
        return null;
    }
    // .... existing code here
}
```

And then the `CsrfFilter` throws a error:

```java
// CsrfFilter.doFilterInternal
protected void doFilterInternal
    (HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
            
    // ...existing code here
    CsrfToken csrfToken = deferredCsrfToken.get();
    String actualToken = this.requestHandler.resolveCsrfTokenValue(request, csrfToken);
    if (!equalsConstantTime(csrfToken.getToken(), actualToken)) {
        boolean missingToken = deferredCsrfToken.isGenerated();
        this.logger.debug(
                LogMessage.of(() -> "Invalid CSRF token found for " 
                    + UrlUtils.buildFullRequestUrl(request)));
                // ... existing code here

    }
    filterChain.doFilter(request, response);
}
```

The `XorCsrfTokenRequestAttributeHandler` expects a XOR'ed CSRF token, but the `CookieCsrfTokenRepository` provided a normal one. That's the reason.


## Solution

After googled, I found this problem was fully discussed on [this stack overflow question](https://stackoverflow.com/questions/74447118/csrf-protection-not-working-with-spring-security-6).

As described before, I realized that [tutorial](https://spring.io/guides/tutorials/spring-boot-oauth2#header) was based on Spring Boot 2. So this may be some 'new feature' problem.-:)
Spring Security replaces `XorCsrfTokenRequestAttributeHandler` with `CsrfTokenRequestAttributeHandler`, which cause the problem, based on this [issue](https://github.com/spring-projects/spring-security/issues/4001).

Some one said that you could customize `csrfTokenRequestHandler` in `HttpSecurity` like this:

```java
@Override
protected void configure(HttpSecurity http) throws Exception {
	// @formatter:off
    http
        // ... existing code here
        .csrf(c -> {
            c.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            c.csrfTokenRequestHandler(new CsrfTokenRequestHandler());
        })
        // ... existing code here
    // @formatter:on
}
```

Code above uses `CsrfTokenRequestHandler` to handle XSRF-TOKEN. But this solution f**ails on the first request and succeeds thereafter**, and also, this means your app likely **vulnerable against the BREACH attack**.

There are special considerations for integrating a single-page application (SPA) with Spring Security’s CSRF protection.

Recall that Spring Security provides BREACH protection of the CsrfToken by default. When storing the expected CSRF token in a cookie, JavaScript applications will only have access to the **plain token** value and will not have access to the encoded value. A customized request handler for resolving the actual token value will need to be provided.

In addition, the cookie storing the CSRF token will be cleared upon authentication success and logout success. Spring Security defers loading a new CSRF token by default, and additional work is required to return a fresh cookie.

So, how to customize csrfTokenRequestHandler to prevent app from both CSRF and BREACH? The following configuration can be used:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // ...
            .csrf((csrf) -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
            );
        return http.build();
    }
}

final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {
    private final CsrfTokenRequestHandler plain = new CsrfTokenRequestAttributeHandler();
    private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

    @Override
    public void handle
    (HttpServletRequest request, HttpServletResponse response, Supplier<CsrfToken> csrfToken) {
        /*
        * Always use XorCsrfTokenRequestAttributeHandler to provide BREACH protection of
        * the CsrfToken when it is rendered in the response body.
        */
        this.xor.handle(request, response, csrfToken);
        /*
        * Render the token value to a cookie by causing the deferred token to be loaded.
        */
        csrfToken.get();
    }

    @Override
    public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
        String headerValue = request.getHeader(csrfToken.getHeaderName());
        /*
        * If the request contains a request header, use CsrfTokenRequestAttributeHandler
        * to resolve the CsrfToken. This applies when a single-page application includes
        * the header value automatically, which was obtained via a cookie containing the
        * raw CsrfToken.
        *
        * In all other cases (e.g. if the request contains a request parameter), use
        * XorCsrfTokenRequestAttributeHandler to resolve the CsrfToken. This applies
        * when a server-side rendered form includes the _csrf request parameter as a
        * hidden input.
        */
        return (StringUtils.hasText(headerValue) ? this.plain : this.xor)
            .resolveCsrfTokenValue(request, csrfToken);
    }
}
```

- Configure `CookieCsrfTokenRepository` with `HttpOnly` set to `false` so the cookie can be read by the JavaScript application.
- Configure a custom `CsrfTokenRequestHandler` that resolves the CSRF token based on whether it is an HTTP request header (X-XSRF-TOKEN) or request parameter (_csrf). This implementation also causes the deferred CsrfToken to be loaded on every request, which will return a new cookie if needed.

> `XorCsrfTokenRequestAttributeHandler` resolves the CSRF TOKEN from request parameter `_csrf`.

## Conclusion

- Spring Security 6 uses `XorCsrfTokenRequestAttributeHandler` to prevent CSRF and BREACH attacks.
- Single page application which wants to prevent CSRF need to customize csrfTokenRequestHandler
- You can use `CookieCsrfTokenRepository` to hold CSRF TOKEN, with `HttpOnly` set to false, the token can
be read by Javascript.


## References


- [Spring Boot and OAuth2](https://spring.io/guides/tutorials/spring-boot-oauth2#header)
- [tutorial-spring-boot-oauth2](https://github.com/spring-guides/tut-spring-boot-oauth2)
- [CSRF protection not working with Spring Security 6](https://stackoverflow.com/questions/74447118/csrf-protection-not-working-with-spring-security-6)
- [SPA CSRF integration Javascript](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html#csrf-integration-javascript-spa)
- [BREACH attack](https://docs.digicert.com/zh/certcentral/certificate-tools/discovery-user-guide/tls-ssl-endpoint-vulnerabilities/breach.html)
- [CSRF token request handler BREACH](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html#csrf-token-request-handler-breach)