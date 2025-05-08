---
title: Use fabric8io/docker-maven-plugin to build image on Windows
date: 2025-01-15
categories: []
BookToc: false
tags: [spring boot, docker]
---

The [spotify docker maven plugin](https://github.com/spotify/docker-maven-plugin) (*Archived since Mar, 2022*) can only build image with local docker client installed. This plugin works fine on my Mac.

But when I switched to Windows(with [docker installed in ubuntu-WSL](/zh-cn/posts/2024/20241031_wsl_and_docker_engine)), problem occurred:

<!--more-->

```cmd
 Caused by: com.spotify.docker.client.exceptions.DockerException: java.util.concurrent.ExecutionException: com.spotify.docker.client.shaded.javax.ws.rs.ProcessingException: java.io.FileNotFoundException: \.\pipe\docker_engine (系统找不到指定的文件。)
```

Which means plugin can not find docker engine running on my machine. That's not the thing! The real reason is that spotify maven plugin can not build image through WSL docker.

An alternative was found after searching google. that's [fabric8io/docker-maven-plugin](https://dmp.fabric8.io/#installation).

This page only shows basic usage of this plugin.

The *fabric8io docker maven plugin* can set remote docker host, which works on Windows with docker installed within WSL.

Below shows the simplest configuration:

```xml
<plugin>
<groupId>io.fabric8</groupId>
<artifactId>docker-maven-plugin</artifactId>
<version>0.45.1</version>
<configuration>
    <dockerHost>tcp://localhost:2375</dockerHost>
    <images>
        <image>
            <name>${docker.image.prefix}/${project.artifactId}:%v</name>
            <build>
                <dockerFile>${project.basedir}/Dockerfile</dockerFile>
            </build>
        </image>
    </images>
    <buildArgs>
        <JAR_FILE>target/${project.build.finalName}.jar</JAR_FILE>
    </buildArgs>
</configuration>
</plugin>
```

>1) `dockerHost` is the WSL host and post WSL docker daemon runs on. 
>
>2) `%v` is the same as `${project.version}`.
>
>3) Image name and tag are configured in `image>name` tag.
>
>4) Dockerfile (*same as spotify docker maven plugin*) is configured in `image>build>dockerFile` tag.
>
>5) Build source(java web application Jar) is configured in `configuration>buildArgs` tag.

You need make some change to make WSL docker daemon listen on 2375 port:

1) open `docker.service` config file:

    `vim /usr/lib/systemd/system/docker.service`

2) modify `docker.service` setting:

    ```cmd
    # default setting
    # ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
    # new setting
    ExecStart=/usr/bin/dockerd -H tcp://0.0.0.0:2375 -H unix://var/run/docker.sock
    ```

3) restart docker daemon:

    ```cmd
    systemctl daemon-reload
    systemctl restart docker
    ```

After that, you can run `mvn clean package docker:build -DskipTests` to build docker image.

To run docker image with docker-compose, use `wsl docker compose up` on Windows.

## References

- [java.io.FileNotFoundException: \.\pipe\docker_engine](https://blog.csdn.net/qq_43437874/article/details/107198498)
- [io.fabric8.docker-maven-plugin插件使用](https://blog.csdn.net/u010427387/article/details/122088632)
- [fabric8 documents](https://dmp.fabric8.io/#image-name)
