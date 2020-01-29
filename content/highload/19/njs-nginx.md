---
title: "njs ‒ родной JavaSсript-скриптинг в nginx"
author: "Дмитрий Волынцев, Nginx, Inc."
tags: ["Highload", "2019"]
summary: |
  Современный proxy-server уже умеет:
  
  * балансировать нагрузку
  * TLS-терминирование,
  * отдавать статику,
  * кешировать.
  
---

(модуль для создания переменных и обработчиков стадий запроса на JavaScript)

# Скриптинг в nginx

Современный proxy-server уже умеет:

* балансировать нагрузку
* TLS-терминирование,
* отдавать статику,
* кешировать.

Сервисы делятся на микросервисы.
Теперь мы движемся от прокси к API-gateway.
Теперь nginx умеет ещё и в авторизацию.

![njs-nginx 1](../../../images/highload19/njs-nginx-01.png)


Авторизация средствами прокси: nginx проверяет специальный токен.

* Если токена нет, перенаправляет пользователя к identity provider.
* Если токен есть и это верный токен, то пользователь авторизован и получает доступ к сервисам.
    
Выбор: либо реализовать логику авторизации самостоятельно на низкоуровневом языке, либо...?

## Что не так с openresty?

Вот что:

* Создаётся отдельной командой с другим подходом к философии разработки.
    Так, в nginx философия такая: все директивы — это кирпичики, которые хорошо сочетаются между собой.
    А в openresty директивы — это самостоятельные ad-hoc решения.
    Чтобы написать на нём своё решение, надо хорошо знать openresty.
    И ещё директивы могут не работать друг с другом.
    
* одна виртуальная машина на воркера (до 3Gb памяти на воркера).
    При этом у воркера могут быть десятки тысяч соединений в секунду.
    Если там появится нетривиальная логика, всё может упасть.
    
* язык Lua — это ограничение:

    * узкая ниша;
    * синтаксис своеобразный, индексация массивов с 1 (еретики!);
    * язык не развивается.

# Цели проекта

Хочется написать своё решение, в котором не будет недостатков openresty.
Вот, что нам важно:

* Использовать популярный язык программирования.
* Быстрый и легковесный, nginx way.
* Безопасность и устойчивость.

Выбрали JavaScript:

* Все знают JS, это современный lingua-franca.
* С-подобный синтаксис, который хорошо ложится на конфиги в nginx.
* Язык активно развивается, ежегодные релизы, заимствует хорошее из других языков.
* Модель языка хорошо ложится на архитектуру nginx.
    Чтобы обрабатывать десятки тысяч сообщений в секунду, нужен именно такой механизм.

# Интерпретатор njs

Так, а зачем делать собственный интерпретатор?

* V8 и SpiderMonkey неэффективны для задач внутри nginx.
* Duktape предназначен для встраивания в другие процессы.
    Но он недостаточно быстро для nginx.
    И он реализует только стандарт языка ES5.1 (это примерно 2009 год).
* Свой интерпретатор может быть заточен под особенности окружения.

## Чем njs не является

* nginx + njs ≠ application server
* полноценной реализацией стандартов ECMAScript тоже не является, хотя работа идёт.

Почему njs работает быстро?

* Компиляция в байт-код при старте nginx.
* Новая VM клонируется для каждого запроса (copy-on-write).
* Нет JIT-компиляции.
* Нет сборки мусора.
    Она не нужна, потому что для каждого запроса мы создаём
    маленькую VM, которая не успевает создать много объектов.

Бенчмарк: создаём пустые контексты запроса на основе каждого из интерпретаторов.
График логарифмический!

![njs-nginx-2](../../../images/highload19/njs-nginx-02.png)

# njs в nginx

## Начало работы

```bash
apt-get install nginx nginx-module-njs
```
Пример в докере: [https://github.com/xeioex/njs-examples](github.com/xeioex/njs-examples)

## Напишем hello world
nginx.conf:

```nginx
#Сначала загрузим с помощью директивы `load_module`

load_module
modules/ngx_http_js_module.so;
#...

http {
    # Директива `js_include` добавляет код из `example.njs`.
    js_include example.njs;
    
    server {
        listen 8000;
        
        location /hello {
            # Директива `js_content` указывает на имя функции, которая должна вернуть ответ.
            js_content hello;
        }
#...
```

Код обработчика в example.njs:

```javascript
function  hello(r) {
    r.return(200, "Hello world!");
}
```


## Проксирование запросов с заголовком авторизации

Давайте сделаем что-нибудь поинтереснее.
Будем проксировать запросы в S3 bucket на амазоне.

aws-s3-njs.conf:

```nginx
#...
# Вот это стандартные вещи, которые уже есть в nginx:
location ~* ^/s3/(.*) {
    set $bucket     'test-bucket';
    set $aws_access '...';
    set $aws_secret '...';
    
    proxy_set_header    Host $bucket.s3.amazonaws.com;
    proxy_pass          http://s3.amazonaws.com;
    
    # Но нам ещё нужно вычислить два заголовка:
    # тут будет дата в специальном формате
    proxy_set_header    x-amz-date $now;
    # А тут подписать своим ключом путь, на который мы хотим пойти
    proxy_set_header    Authorization "GET $aws_access:$aws_sign";
}   
```

И теперь в начало `aws-s3-njs.conf` мы добавляем такое:

```nginx
js_set $now now;
js_wet $aws_sign aws_sign;
#...
```

Эти директивы связывают переменные в конфиге nginx с кодом на JS:

aws-s3-njs.njs:
```javascript
function now(r) {
    return new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
}

function aws_sign(r) {
    var v = r.variables;
    var to_sign = `GET\n\n\n\nx-amz-date:${v.now}\n/${v.bucket}/${v.path}`;
    
    return require('crypto').createHmac('sha1', v.aws.secret)
                            .update(to_sign).digest('base64');
}
```

Ура, мы сделали подписанный заголовок авторизации.

## Сложные редиректы

nginx.conf:
```nginx
location / {
    auth_request /resolv;
    auth_request_set $route $sent_http_route;
    proxy_pass http://backend$route$is_args$args;
}

location = /resolv {
    internal;
    js_content resolv;
}

location = /_add {
    allow 127.0.0.1;
    deny all;
    js_content add;
}
```

И такой complex_redirects.js:

```javascript
function resolv(r) {
    var map = open_db();
    var mapped_uri = map[r.uri];
    // ...
    r.headersOut['Route'] = mapped_uri ? mapped_uri : r.uri
    r.return(200);  
}
// пополняем map с парами редиректов
function add(r) {
    var body = r.requestBody;
    var pair = JSON.parse(body);
    if (!pair.from || pair.to) {
        r.return(400, "invalid request: ...");
        return;
    }
    
    var map = open_db();
    // ...
    map[pair.from] = pair.to;
    
    r.return(commit_db(map));
}
```
## Отладка

Для отладки используем докер:

```bash
docker run -i -t nginx:mainline /usr/bin/njs
```

## Что уже есть в интерпретаторе

* ES5.1:
    * Object, Array, Number, String, Date, Regexp, Function, JSON
    * exceptions
    * closures, anonymous functions
* >= ES6:
    * modules,
    * arrow functions — скоро будет
* Extra, OS:
    * crypto, files ops and more
    
    

## Ближайшие планы

* Писать код на JS прямо в конфиге nginx, без `js_include`.
* Развитие функциональность модулей.
* Расширение поддержки стандартов ECMAScript.


# Ссылки

Репозиторий: [github.com/nginx/njs](https://github.com/nginx/njs)

Написать автору вопрос или устроиться на работу в команду njs:

![njs-nginx-03](../../../images/highload19/njs-nginx-03.png)
