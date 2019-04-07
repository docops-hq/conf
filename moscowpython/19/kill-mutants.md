<p align="right">
<a href = "https://conf.python.ru/2019"><img src = "./static/i_pc.png" width="20px" height=20px"> Moscow Python Conf++</a> 
<a href = "https://knowledgeconf.ru"><img src = "./static/kc.png" width="20px" height=20px"> KnowledgeConf</a> 
<a href = "https://t.me/docops"><img src = "./static/tg.png" width="20px" height=20px">@docops</a>
</p>

# Убивай мутантов, спаси свой код

Никита Соболев, wemake.services

Доклад про мутационное тестирование.
Если у вас уже есть 100% покрытие по всем параметрам, то вам сюда.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Наши тесты ничего не проверяют. Что с этим делать](#%D0%BD%D0%B0%D1%88%D0%B8-%D1%82%D0%B5%D1%81%D1%82%D1%8B-%D0%BD%D0%B8%D1%87%D0%B5%D0%B3%D0%BE-%D0%BD%D0%B5-%D0%BF%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D1%8F%D1%8E%D1%82-%D1%87%D1%82%D0%BE-%D1%81-%D1%8D%D1%82%D0%B8%D0%BC-%D0%B4%D0%B5%D0%BB%D0%B0%D1%82%D1%8C)
  - [Писать больше тестов?](#%D0%BF%D0%B8%D1%81%D0%B0%D1%82%D1%8C-%D0%B1%D0%BE%D0%BB%D1%8C%D1%88%D0%B5-%D1%82%D0%B5%D1%81%D1%82%D0%BE%D0%B2)
  - [Повысить покрытие?](#%D0%BF%D0%BE%D0%B2%D1%8B%D1%81%D0%B8%D1%82%D1%8C-%D0%BF%D0%BE%D0%BA%D1%80%D1%8B%D1%82%D0%B8%D0%B5)
  - [Cтроже ревьюить?](#c%D1%82%D1%80%D0%BE%D0%B6%D0%B5-%D1%80%D0%B5%D0%B2%D1%8C%D1%8E%D0%B8%D1%82%D1%8C)
  - [Нет, придётся тестировать тесты](#%D0%BD%D0%B5%D1%82-%D0%BF%D1%80%D0%B8%D0%B4%D1%91%D1%82%D1%81%D1%8F-%D1%82%D0%B5%D1%81%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D1%82%D1%8C-%D1%82%D0%B5%D1%81%D1%82%D1%8B)
- [Технология мутации](#%D1%82%D0%B5%D1%85%D0%BD%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%8F-%D0%BC%D1%83%D1%82%D0%B0%D1%86%D0%B8%D0%B8)
- [Инструменты](#%D0%B8%D0%BD%D1%81%D1%82%D1%80%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D1%8B)
- [Какие ошибки можно найти](#%D0%BA%D0%B0%D0%BA%D0%B8%D0%B5-%D0%BE%D1%88%D0%B8%D0%B1%D0%BA%D0%B8-%D0%BC%D0%BE%D0%B6%D0%BD%D0%BE-%D0%BD%D0%B0%D0%B9%D1%82%D0%B8)
  - [Плохие данные](#%D0%BF%D0%BB%D0%BE%D1%85%D0%B8%D0%B5-%D0%B4%D0%B0%D0%BD%D0%BD%D1%8B%D0%B5)
  - [Плохие тесты](#%D0%BF%D0%BB%D0%BE%D1%85%D0%B8%D0%B5-%D1%82%D0%B5%D1%81%D1%82%D1%8B)
  - [Связанные данные](#%D1%81%D0%B2%D1%8F%D0%B7%D0%B0%D0%BD%D0%BD%D1%8B%D0%B5-%D0%B4%D0%B0%D0%BD%D0%BD%D1%8B%D0%B5)
  - [Частичные тесты](#%D1%87%D0%B0%D1%81%D1%82%D0%B8%D1%87%D0%BD%D1%8B%D0%B5-%D1%82%D0%B5%D1%81%D1%82%D1%8B)
  - [Медленные и бесконечные тесты](#%D0%BC%D0%B5%D0%B4%D0%BB%D0%B5%D0%BD%D0%BD%D1%8B%D0%B5-%D0%B8-%D0%B1%D0%B5%D1%81%D0%BA%D0%BE%D0%BD%D0%B5%D1%87%D0%BD%D1%8B%D0%B5-%D1%82%D0%B5%D1%81%D1%82%D1%8B)
- [Не весь код полезно мутировать](#%D0%BD%D0%B5-%D0%B2%D0%B5%D1%81%D1%8C-%D0%BA%D0%BE%D0%B4-%D0%BF%D0%BE%D0%BB%D0%B5%D0%B7%D0%BD%D0%BE-%D0%BC%D1%83%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D1%82%D1%8C)
- [Как настроить и запустить mutmut](#%D0%BA%D0%B0%D0%BA-%D0%BD%D0%B0%D1%81%D1%82%D1%80%D0%BE%D0%B8%D1%82%D1%8C-%D0%B8-%D0%B7%D0%B0%D0%BF%D1%83%D1%81%D1%82%D0%B8%D1%82%D1%8C-mutmut)
- [Результаты](#%D1%80%D0%B5%D0%B7%D1%83%D0%BB%D1%8C%D1%82%D0%B0%D1%82%D1%8B)
  - [Property-based тесты](#property-based-%D1%82%D0%B5%D1%81%D1%82%D1%8B)
- [Когда не нужно использовать мутационное тестирование](#%D0%BA%D0%BE%D0%B3%D0%B4%D0%B0-%D0%BD%D0%B5-%D0%BD%D1%83%D0%B6%D0%BD%D0%BE-%D0%B8%D1%81%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D1%8C-%D0%BC%D1%83%D1%82%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%BD%D0%BE%D0%B5-%D1%82%D0%B5%D1%81%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5)
- [Выводы](#%D0%B2%D1%8B%D0%B2%D0%BE%D0%B4%D1%8B)
- [Ссылки](#%D1%81%D1%81%D1%8B%D0%BB%D0%BA%D0%B8)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Наши тесты ничего не проверяют. Что с этим делать

Как мы работаем:

1. Прилетает пуллреквест с изменениями кода и тестов
2. Проходит CI
3. Ревью кода.
4. Мерж в мастер
5. Всё в огне!

Почему так? Потому что наши тесты ничего не проверяют.

«Логичные» выводы:

* писать больше тестов
* увеличивать покрытие
* больше ревьюить.

Давайте разберём их подробнее.

## Писать больше тестов?

Давайте попробуем.

* больше тестов = больше кода (тестов),
* больше кода = больше багов,
* а ещё, больше тестов = больше дубликатов,
* и наконец, больше тестов = затык на CI.

Не надо больше тестов!
Надо меньше, но лучше.

## Повысить покрытие?

Дальше, повысили покрытие.
Ну вот у нас 100% покрытия.
И что?

Вот функция из одной строчки.
Она полностью покрыта тестами и работает.
```python
def negate(first: float):
    """Return the negated number."""
    return 0 - first
```

А вот тест, который полностью покрывает эту функцию.

```python
@pytest.mark.parametrize('given, expected', [
    (-1,1),
    (0,0),
    (0.5,0.5),
])
def test_negate(given, expected):
    function_result = negate(given)
    
    # TODO: uncomment this line:
    # assert function_result == expected
```

Покрытия мало, нужны сами проверки.
Вывод: надо тестировать тесты.

## Cтроже ревьюить?

В хорошем проекте тестов гораздо больше, чем кода.
В коде хорошая понятная логика, а в тестах — сборник непонятных ситуаций, которые могут и не произойти.
А ещё тесты обычно написаны плохо, но их читаемость можно повышать.

Бывает, что человек удалил тест. Почему?
Может, тест падал?
Или он больше не нужен?
Очень сложно понять это на ревью.

## Нет, придётся тестировать тесты

Ничего из этого не работает.
Придётся тестировать тесты.
Давайте поймём, как это делать.

Как обычно выглядит первая задача на новом проекте:

* Сотни тысяч строк кода
* Десятки тысяч тестов
* Одна простая новая фича

Мы что-то меняем и проверяем, работает или нет.
Пока знания кода нет, мы меняем код в случайных местах.

Посмотрим на пример: оптимизировали сортировку пузырьком.

```diff
def bubble_sort(array: list) -> list:
    length = len(array)
    for first in range(length - 1):
+++     swapped = False    
        for second in range(length - 1 - first):
            if array [second] > array[second + 1]:
+++             swapped = True
                array[second], array[second + 1] = \
                    (array[second + 1], array[second])
+++     if not swapped:
+++         break
    return array
```

Тесты проходят, всё отлично, да?
Давайте точно зафейлим метод:

```diff
    length = len(array)
    for first in range(length - 1):
+++     raise ValueError('Should fail!')  
```
А тесты снова проходят. О_о. Как же так?
Давайте поправим тест, который не упал, а должен был.
Теперь тесты падают и это нам нравится.

Отлично, давайте теперь ломать весь оставшийся код!
По очереди немного поменяем каждую строку в проекте.

Например, так.
```diff
--- if oversize > 0:
+++ if oversize > 1:
        print('{0} exceeds {1} limit by {2}'.format(
            arguments.image,
            arguments.size,
            format_size(oversize, binary=True),
        ))
```
Хорошие тесты должны упасть в этом месте.

А что если поменять формат принта?
```diff
if oversize > 0:
--- print('{0} exceeds {1} limit by {2}'.format(
+++ print('XX{0} xx {1} xxx by {2}XX'.format(
        arguments.image,
        arguments.size,
        format_size(oversize, binary=True),
    ))
```

А если поменять `True` на `False`?

```diff
if oversize > 0:
    print('{0} exceeds {1} limit by {2}'.format(
        arguments.image,
        arguments.size,
---     format_size(oversize, binary=True),
+++     format_size(oversize, binary=False),
    ))
```
После каждой мутации мы прогоняем тесты.
Вот что может случиться:

* тесты упадут и убьют мутанта
* таймаут
* WTF
* тесты пропустят мутанта и не упадут

# Технология мутации

Не регулярками же менять код. Давайте как-нибудь по-умному это делать.

Берём абстрактное синтаксическое дерево (AST).
Конкретные кусочки меняем на похожие, например так:

```
+       —>  -
True    —>  False
x       —>  not x
'a'     —>  'X'
and     —>  or
>       —>  >=
```

Вообще, стратегий очень много.

Алгоритм мутационного тестирования такой:

* Мутируем строчку кода
* Запускаем тесты
* Собираем статистику: упало или нет
* Повторяем

# Инструменты

|           | Интеграция с pytest | Отчёты             | Работает            |
|-----------|---------------------|--------------------|---------------------|
| CosmicRay | :x:                 | :heavy_check_mark: | :heavy_check_mark:  |
| MutPy     | :x:                 | :heavy_check_mark: | :x:[*](#why)        |
| mutmut    | :heavy_check_mark:  | :heavy_check_mark: | :heavy_check_mark:  |

<span id="why"><sup>*</sup></span>MutPy у Никиты вообще не завёлся.

# Какие ошибки можно найти

## Плохие данные

```python
def add(first: float, second: float):
    """Simple function to show the problem."""
    return first + second
    
def test_add():
    assert add(0, 0) == 0
    assert add(2, 2) == 4
```
Тут всё очевидно, а в реальной жизни мы не замечаем плохие тестовые данные, потому что они сложные.

## Плохие тесты

Плохие тесты — такие, которые ничего не тестируют.

```python
app = Flask(__name__)

@app.route('/<int:index>')
def hello(index: int):
    return 'Hello, world! {0} faith in you.'.format(
        1 * index,
    )

@app.errorhandler(Exception)
def log_to_sentry_and_show_sorry_page(exception):
    # попросили сделать статус 200 ради SEO
    return 'S0rry, world :(', 200

def test_hello_view(flask_client):
    """This test does nothing."""
    response = flask_client.get('/0')
    
    assert response.status_code == 200
    assert b'world' in response.data
    assert b'0' in response.data
```

А `1 * index` — это вообще бизнес-логика.
Её нужно вынести в отдельную функцию и тестировать юнит-тестами.
Вот так надо:

```python
@app.route('/<int:index>')
def hello(index: int):
    return 'Hello, world! {0} faith in you.'.format(
        calculate_faith(index),
    )
```

## Связанные данные

```diff
WRONG_LETTERS = [
--- 'a',
+++ 'X',
]

def is_wrong_letter(letter:str) -> bool:
    return letter in WRONG_LETTERS
```
А вот наш тест, который использует те же данные, что и метод:

```python
from source import WRONG_LETTERS, is_wrong_letter

@pytest.mark.parametrize('letter', WRONG_LETTERS)
def test_is_wrong_letter(letter):
    assert is_wrong_letter(letter) is True
```

Правильно — задублировать данные:

```python
@pytest.mark.parametrize('letter', ['a'])
def test_is_wrong_letter(letter):
    assert is_wrong_letter(letter) is True
```

## Частичные тесты 

```python
def test_save_subscription(form):
    instance = save_subscription(form)
    
    assert instance.id > 0
    assert instance.name == form.data['name']
```
А функция такая.
Она не только сохраняет подписку, но ещё и отправляет рассылку.
И мы это не тестируем, а должны.

```diff
def save_subscription(form):
    subscription = form.save()
--- queue_welcome_email.delay(subscription.id)
+++ queue_welcome_email.delay(None)
    return subscription
```

Тестируйте сайд-эффекты!

```diff
def test_save_subscription(form):
    instance = save_subscription(form)
    
    assert instance.id > 0
    assert instance.name == form.data['name']
+++ assert redis.get(queue(instance))
```

## Медленные и бесконечные тесты

Ставьте таймаут.
Тесты с таймаутом помогут вам не уронить прод.

> pypi.org/project/pytest-timeout

```diff
CELERY_BROKER_URL = 'redis://{host}:{port}'.format(
--- host=config('HOST', default='localhost'),
+++ host=config('HOST', default='XXlocalhostXX'),
    ...
)
```

# Не весь код полезно мутировать

Как не создавать бесполезных мутантов?

1. Запускаем конкретный тест.
1. Собираем coverage.
1. Мутируем только нужный код: `--path-to-mutate`.

Всё это очень долго.
Например, если у нас 1 тест и 1000 мутаций, то они займут 16 минут.
Как оптимизировать?

1. Отключаем плагины: coverage, random ordering, дополнительные проверки. Стало 15 минут.
2. Ничего не пишем: `--tb=no --quiet`. 10 минут.
3. Падаем на первом тесте: `--exitfirst`. 6 минут.
4. А теперь проверяем только тот код, который покрыт тестами: `--use-coverage`.
    Тут мы запускаем тесты 1 раз, чтобы посчитать coverage, а потом используем его для мутации.
    Стало 5 минут.
5. Плагин `pytest.testmon`: `--testmon`.
    Когда мы поменяли кусочек кода, надо запустить именно тот тест, который за него отвечает.
    Это тоже определяется с помощью coverage.
    Теперь 4 минуты.

# Как настроить и запустить mutmut

Настроить:
```ini
[mutmut]
paths_to_mutate=src/
backup=False
runner=pytest -x -q --tb=no --testmon -o addopts=""
tests_dir=tests/
```

Запустить:

```bash
mutmut run --use-coverage -s
```
# Результаты

Вспомним, что мы хотели, чтобы тестов было меньше и они были лучше.
Теперь мы можем найти лишние тесты (которые не падают) и убрать их.
У mutmut есть хук `--post-mutation`.
Мы можем им записать тесты, которые не упали ни разу.

Всё это отлично работает с TDD.
Пишем код и сразу тесты.
Мутируем код, мутируем тесты, всё проверяем.
Теперь наши тесты сразу хорошие.

## Property-based тесты

Если код поменяли, а тесты проходят — значит данные плохие.
Мутационное тестирование поможет найти места, где нужны такие тесты, и подобрать для них хорошие данные.

# Когда не нужно использовать мутационное тестирование

Есть другие способы улучшать проект.
Их проще внедрять и они дешевле обходятся.
Вот когда у вас уже есть линтеры, проверка типов, юнит- и интеграционные тесты, property-based тесты и даже тесты на документацию, и вы хотите сделать что-то ещё — вот тогда занимайтесь мутационным тестированием.


# Выводы

*   Мы напишем больше тестов!

    **Нет, лучше мы удалим лишние тесты.**
    
*   Мы повысим покрытие!

    **Не просто повысим, но и проверим, что тесты что-то тестируют.**
    
*   Будем строже ревьюить!

    **Наоборот, упростим процесс ревью.**
    
*   Автоматизируем всё!

    **Да.**

# Ссылки

* [github.com/boxed/mutmut](https://github.com/boxed/mutmut)
* [github.com/sobolevn/heisenbug-2019](https://github.com/sobolevn/heisenbug-2019)
* Вопросы сюда: [github.com/sobolevn](https://github.com/sobolevn)
* Читайте [sobolevn.me](https://sobolevn.me/)
