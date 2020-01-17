---
title: "Что делать, если ваш код на Python тормозит"
author: "Григорий Бакунов, Яндекс"
tags: ["Moscow Python Conf", "2019", "Яндекс", "Python"]
summary: |
  Когда в списке `resp` оказываются сотни тысяч элементов — а их реально столько
  — программа внезапно очень медленно работает.
  
  10 000 сообщений:

---

> «Если хочешь делать что-то большое в каком-то интересном тебе проекте,
    то ты обязан разбираться в его кодовой базе и понимать, что там происходит.
    А если ты сам код не пишешь — ну как ты будешь разбираться в кодовой базе?»

# Введение

Изначальный код, в котором не всё в порядке:

```python
from copy import copy
def crc_code(text: str) -> int:
    res = 0
    for x in text:
        res += ord(x)
    return res
    
def send_notification(respondents: list, message: dict) -> None:
    for resp in respondents:
        to_send = copy(message)
        if "subject" not in to_send:
            to_send["subject"] = "Hello, " + str(resp)
        if "from" not in to_send:
            to_send["from"] = None
        to_send['body'] = to_send['body'].replace('@respondent@', resp)
        to_send['crc'] = crc_code(to_send['body'])
        
        # rpc_real_send(to_send)
```

Когда в списке `resp` оказываются сотни тысяч элементов — а их реально столько
— программа внезапно очень медленно работает.

10 000 сообщений:

```
* simple        1.69s.
* with subject  1.68s.
    * with from 1.70s.
```

Возьмём это время 1.69s за эталон, 1х.

# Cython

Будем ускорять код, не особо его оптимизируя.

```bash
$ cythonize -a -i modulename.pyx
```

Результат:
```
* simple        0.5610x
* with subject  0.5391x
    * with from 0.5837x
```

# PyPy

PyPy — альтернативный интерпретатор с другим подходом к интерпретации языка.
Раньше нижняя строчка была больше, а теперь она меньше.

```
* simple        0.1040x
* with subject  0.0912x
    * with from 0.0809x
```
# numba

Ок, теперь давайте попробуем менять код.
Используем [numba](https://numba.pydata.org/):

```python
@jit(nogil=True, cache=True)
def crc_code(text: str) -> int:
    ...
    
@jit(nogil=True, cache=True)
def send_notification(respondents: list, message: dict) -> None:
    ...
```
Стало хуже!

```
* simple        1.440x
* with subject  2.197x
    * with from 1.912x
```

Это неспроста.
Цель numba — ускорять работу с научными приложениями и бигдатой.
Фокус на обработке большими списками и другими структурами данных.
А при работе со строками становится хуже.

Из официальной документации:

> Optimized code paths for efficiently accessing single characters may be introduced in the future.

# Вынести операции из цикла

Похоже, придётся менять код.

Если внутри цикла есть операции, которые можно не выполнять внутри цикла, 
    обязательно выполняйте их вне цикла:
    
```python
def send_notification(respondents: list, message: dict) -> None:
    to_send = copy(message)
    no_subj = "subject" not in to_send
    if "from" not in to_send:
        to_send["from"] = respondents[0]
    for resp in respondents:
        if no_subj:
            to_send["subject"] = "Hello, " + str(resp)
        to_send['body'] = message['body'].replace('@respondent@', resp)
        to_send['crc'] = crc_code(to_send['body'])
        
        # rpc_real_send(to_send)
```

Результат так себе:

```
* simple        0.9633x
* with subject  0.9457x
    * with from 0.9446x
```

Когда правишь очевидные вещи, не выигрываешь в производительности.
Надо профилировать.
В нашем коде больше всего тормозит самописная «контрольная сумма»,
которая на самом деле просто сумма.

# Go

Можно было бы взять [grumpy](https://github.com/google/grumpy) и конвертировать код на Python в код на Go.
Но он поддерживает только Python 2.6.
И не работает.

Ок, есть программа для биндинга кода на Go — [pybindgen](https://github.com/gjcarneiro/pybindgen).
Пишете программу на Go, а pybindben генерит биндинги, чтобы обращаться из Python.
Проблема в том, что код работает медленнее, чем на Python 3.7.

# Nim

Попробуем [nim](https://nim-lang.org/) и [nimpy](https://github.com/yglukhov/nimpy).
Вот это мы напишем прямо посреди кода на Python.

```nim
import nimpy

proc crc_code(text: string): int{.exportpy.} =
    var res = 0
    for x in 0..text.len-1:
        res = res + ord(text[x])
    return res
```

```bash
$ nim c --app:lib --out:crc.so crc.nim
```

Результат примерно как с PyPy:

```
* simple        0.1199x
* with subject  0.0968x
    * with from 0.1085x
```

Но ради этого результата придётся тащить в свой код на Python
код на другом языке программирования.
Готовы ли вы к этому?
Готова ли команда?
А вот Григорий готов!

# Снова Cython

Давайте перепишем контрольную сумму с использованием кода на Cython.

Было:
```python
from copy import copy
def crc_code(text: str) -> int:
    res = 0
    for x in text:
        res += ord(x)
    return res
```

Стало:

```cython
def crc_code(text: str) -> int:
    data_text = text.encode('UTF-8')
    cdef char* c_text = data_text
    cdef bint res = 0
    for x from 0 <= x < len(data_text):
        res += c_text[x]
    return  res
```

Важно: Cython плохо совмещает вызов функций из Python и из C в одной строке.
Поэтому здесь `encode` и присваивание разнесены на две строки:

```cython
data_text = text.encode('UTF-8')
cdef char* c_text = data_text
```

Результат:

```
* simple        0.0135x
* with subject  0.0114x
    * with from 0.0126x
```

Cython и Nim работают похожим образом: созадют код на C, из которого потом компилируется бинарник.
При этом в Cython код получается почти таким же, как если сразу писать на C.
А накладных расходов на программирование очень мало.
Программист на Python вполне способен понять, что делает этот код.

# Выводы

* Иногда достаточно PyPy, если он уже поддерживает всё, что вам нужно.
    Ускоряет примерно в 10 раз.
* Оптимизация *простого* кода тоже важна.
    Но если вы оптимизируете код, который уже хорошо написан,
    наверняка вы делаете его менее понятным.
* Инструментарий должен быть стабильным и не регрессировать от релиза к релизу.
    Автор считает стабильными и активно использует PyPy, Cython и Nimpy.
* Не бойтесь эзотерических языков, особенно если это ваш пет-проект или команда маленькая.
    Это весело.
    Кстати, Python 3 в Яндексе долгое время считался эзотерическим языком.
* Ускорять приложения с помощью новых приложений — необоснованный риск. 
    В большинстве случаев проверенных инструментов и роста производительности в 10-15 раз вам хватит.
    
# Вопросы и ответы

Q: Нач что ещё посмотреть из эзотерических вариантов Python?  
A: На GraalVM. В некоторых случаях работает в 3-4 раза быстрее Cython, но нестабилен.

Q: А почему бы не подгружать функции напрямую из C с помощью [CFFI](https://cffi.readthedocs.io/en/latest/)?  
A: Потому что придётся писать прямо на C.
    Автор законтрибьютил 14 строк на C в ядро Linux, и за два года в них нашли 4 ошибки.
    Но если у вас есть хорошие программисты на C — используйте.

Q: Что из вышеперечисленного используется на проде в Яндексе?  
A: Есть PyPy и Cython, но не везде.
