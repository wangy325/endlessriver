---
title: "在Docker Compose配置环境变量的几种方法"
date: 2024-11-30
author: wangy325
BookToC: true
categories: []
tags: [Docker]
---


Docker Compose 是一个用于定义和运行多容器 Docker 应用程序的工具。 它允许您定义组成应用程序的服务、它们连接到的网络以及它们运行所需的环境变量。

使用 Docker Compose，可以在容器中通过多种方式设置环境变量。可以使用 Compose 文件或 CLI。

请注意，每种方法都受[环境变量优先级](https://docs.docker.com/compose/environment-variables/envvars-precedence/) 的约束。

<!--more-->

{{< hint info >}}
不要使用环境变量向容器传递敏感信息，例如密码。改用 secrets。
{{< /hint >}}

## Compose 文件

### 用 .env 文件代替

Docker Compose 中的 `.env` 文件是一个纯文本文件，用于定义当运行 `docker compose up` 时应在 Docker 容器中提供哪些环境变量。此文件通常包含环境变量的键值对，可用于集中管理各处配置。如果需要存储多个环境变量，可以使用 `.env` 文件。

`.env`文件是容器中设置环境变量的默认方法。`.env` 文件应与 `compose.yaml` 文件放在项目目录的根目录下。有关环境文件的格式化，请参阅 环境文件语法。

下面是一个简单的示例：

```shell
$ cat .env
TAG=v1.5

$ cat compose.yml
services:
  web:
   image: "webapp:${TAG}"
```

运行 `docker compose up` 时，Compose 文件中定义的 web 服务会内插 `.env` 文件中设置的镜像`webapp:v1.5`。可以通过 `config` 命令 验证这一点，此命令将已解析的应用程序配置打印到终端：


```shell
$ docker compose config

services:
  web:
   image: 'webapp:v1.5'
```

#### 其他信息

1) 在 Docker Compose 版本 2.24.0 中，可以设置 `.env` 文件为可选，方法是使用 `env_file` 属性。当 `required` 设置为 `false` 且 `.env` 文件丢失时，Compose 会静默忽略该条目。

    ```yaml
    env_file:
      - path: ./default.env
        required: true # default
      - path: ./override.env
        required: false
    ```

2) 如果在`.env`文件中定义了环境变量，可以使用 `environment` [属性](https://docs.docker.com/compose/compose-file/05-services/#environment) 在 `compose.yml` 中直接引用它。例如，如果 `.env` 文件包含环境变量 `DEBUG=1`，`compose.yml` 文件类似于以下内容：

    ```yaml
    services:
      webapp:
        image: my-webapp-image
      environment:
        - DEBUG=${DEBUG}
    ```

    Docker Compose 会用 `.env` 文件中的值替换 `${DEBUG}`

3) 可以使用 `env_file` 属性 在 `compose.yml` 中使用多个 `.env` 文件，Docker Compose 会按指定的顺序读取这些文件。如果在多个文件中定义了相同的变量，则最后一个定义优先：

    ```yaml
    services:
    webapp:
      image: my-webapp-image
      env_file:
      - .env
      - .env.override
    ```

4) 可以将 `.env` 文件放在项目目录的根目录**以外的位置**，然后使用以下方法之一，使 Compose 能够找到它：

    - CLI 中的 `--env-file` [选项](https://simi.studio/ways-to-set-environment-variables-with-docker-compose/#substitute-with---env-file)
    - 使用 Compose 文件中的 `env_file` [属性](https://docs.docker.com/compose/compose-file/05-services/#env_file)

5) 可以通过使用 `docker-compose up -e` 从命令行覆盖 `.env` 文件中的值。

6) 如果使用`--env-file` 替换另一个 `.env` 文件，则 `.env` 文件会被覆盖。

{{< hint warning >}}
从 `.env` 文件进行替换是一种 Docker Compose CLI 功能。

在运行 docker stack deploy 时，Swarm 不支持此功能。
{{< /hint >}}


### 使用 environment 属性

无需使用 `.env` 文件，便可以在 Compose 文件中直接使用 `environment` 属性设置**环境变量**。其工作方式与 `docker run -e VARIABLE=VALUE ...` 相同。

```yaml
web:
  environment:
    - DEBUG=1
```

有关如何使用它的更多示例，请参阅 [environment属性](https://docs.docker.com/compose/compose-file/05-services/#environment)。

#### 其他信息

1) 可以选择不设置值，而是将 Shell 中的环境变量直接传递到容器中。其工作方式与 `docker run -e VARIABLE ...` 相同：

    ```yaml
    web:
    environment:
      - DEBUG
    ```

2) 容器中 DEBUG 变量的值取自运行 Compose 的 shell 中相同变量的值。注意，在这种情况下，如果 shell 环境中的 DEBUG 变量未设置，则**不会**发出警告。

    还可以利用 [内插](https://docs.docker.com/compose/environment-variables/env-file/#interpolation)。

    ```yaml
    web:
    environment:
      - DEBUG=${DEBUG}
    ```

    结果与上面类似，但如果 shell 环境中未设置 DEBUG 变量，Compose **会发出警告**。

### 使用 env_file 属性

`env_file` 属性 使你可以在 Compose 应用程序中使用多个 `.env` 文件。此功能还有助于将环境变量与主配置文件区分开来，提供了一种更井然有序且更安全的方式来管理敏感信息，因为无需将 `.env` 文件放在项目目录的根目录下。

其工作方式与 `docker run --env-file=FILE ...` 相同。

```yaml
web:
 env_file:
  - web-variables.env
```

#### 其他信息

1) 如果指定了多个文件，它们将按顺序进行评估，并可以覆盖之前文件中设置的值。

2) 在 `.env` 文件中声明的环境变量不能在 Compose 文件中再次单独引用。

3) 如果同时使用 `env_file` 和 `environment` 属性，则由 `environment` 设置的环境变量**优先**。

4) 在 `env_file` 属性中指定到 `.env` 文件的路径是相对于 `compose.yml` 文件的位置。

5) 可以通过使用 `docker compose run -e` 从命令行覆盖 `.env` 文件中的值。

6) 如果使用 `--env-file` 替换另一个 `.env` 文件，则 `.env` 文件会被覆盖。

7) 在 Docker Compose 版本 2.24.0 中，可以通过使用 `required` 字段，将 `.env` 文件设置为可选。当 `required` 设置为 `false` 且 `.env` 文件丢失时，Compose 会静默忽略该条目。

    ```yaml
    env_file:
    - path: ./default.env
      required: true # default
    - path: ./override.env
      required: false
    ```

### 从 shell 中替换

可以使用主机或执行 docker compose 命令的 shell 环境中的现有环境变量。这样便可以在运行时将值动态注入到 Docker Compose 配置当中。

例如，假设 shell 中包含 POSTGRES_VERSION=9.3，并且提供了以下配置：

```yaml
db:
  image: "postgres:${POSTGRES_VERSION}"
```

使用此配置运行 `docker compose up` 时，Compose 会在 shell 中查找 POSTGRES_VERSION 环境变量，并在其中替换其值。对于此示例，Compose 在运行配置之前，将镜像解析为 postgres:9.3。

如果未设置环境变量，Compose 将替换为空字符串。在上面的示例中，如果未设置 POSTGRES_VERSION，则 image 选项的值为 postgres:。

{{< hint info >}}
postgres: 不是有效的镜像引用。Docker 期望没有标记的引用（如 postgres，默认为最新镜像）或带有标记的引用（如 postgres:15）。

在 shell 环境中设置的值会覆盖在 `.env` 文件、`environment` 属性和 `env_file` 属性中设置的值。有关详细信息，请参阅 [环境变量优先级](https://docs.docker.com/compose/environment-variables/envvars-precedence/)。
{{< /hint >}}



## CLI

### 用 –env-file 替换

可以在 [环境文件](https://docs.docker.com/compose/environment-variables/env-file/) 中为多个环境变量设置默认值，然后在 CLI 中将该文件作为参数传递。

此方法的优点是可以将文件存储在任何位置并将其命名为适当的名称，例如，

此文件路径是相对于执行 Docker Compose 命令的当前工作目录。使用 `--env-file` 选项传递文件路径：

```shell
docker compose --env-file ./config/.env.dev up
```

#### 其他信息

1) 如果想临时覆盖 `compose.yml` 文件中已经引用的 `.env` 文件，此方法很有用。例如，可能为生产 (.`env.prod` ) 和测试 (.`env.test`) 有不同的 `.env` 文件。在以下示例中，有两个环境文件，`.env` 和 `.env.dev`。两者都为 TAG 设置了不同的值。

    ```shell
    $ cat .env
    TAG=v1.5

    $ cat ./config/.env.dev
    TAG=v1.6

    $ cat compose.yml
    services:
    web:  image: "webapp:${TAG}"
    ```

    如果没有在命令行中使用 `--env-file`，则默认加载 `.env` 文件：

    ```shell
    $ docker compose config
    services:
    web:  image: 'webapp:v1.5'
    ```

    传递 `--env-file` 参数会覆盖默认文件路径：

    ```shell
    $ docker compose --env-file ./config/.env.dev config
    services:
    web:  image: 'webapp:v1.6'
    ```

    当一个无效的文件路径被传递为 `--env-file` 参数时，Compose 会返回一个错误：

    ```shell
    $ docker compose --env-file ./doesnotexist/.env.dev config
    ERROR: Couldn\'t find env file: /home/user/./doesnotexist/.env.dev
    ```

2) 可以使用多个`--env-file` 选项来指定多个环境文件，Docker Compose 会按顺序读取它们。后面的文件可以覆盖前面的文件中的变量。

    ```shell
    $ docker compose --env-file .env --env-file .env.override up
    ```

3) 从命令行启动容器时，可以覆盖特定的环境变量。

    ```shell
    $ docker compose --env-file .env.dev up -e DATABASE_URL=mysql://new_user:new_password@new_db:3306/new_database
    ```

### 使用 docker compose run –env 设置环境变量

与 `docker run --env` 类似，可以使用 `docker compose run --env` 或其简称 `docker compose run -e` 临时设置环境变量：

```shell
$ docker compose run -e DEBUG=1 web python console.py
```

#### 其他信息

也可以通过不给变量赋值的方式从 shell 中传递变量：

```shell
$ docker compose run -e DEBUG web python console.py
```

容器中 DEBUG 变量的值取自运行 Compose 的 shell 中相同变量的值。

## 其他资源

- [了解环境变量优先级](https://docs.docker.com/compose/environment-variables/envvars-precedence/)
- [设置或更改预定义的环境变量](https://docs.docker.com/compose/environment-variables/envvars/)
- [探索最佳实践](https://docs.docker.com/compose/environment-variables/best-practices/)
- [了解环境文件的语法和格式指南](https://docs.docker.com/compose/environment-variables/env-file/)

## 参考资料

[Ways to set environment variables with Compose](https://docs.docker.com/compose/environment-variables/set-environment-variables/)
[原文🔗️](https://simi.studio/ways-to-set-environment-variables-with-docker-compose/#%E4%BB%8E-shell-%E4%B8%AD%E6%9B%BF%E6%8D%A2)
