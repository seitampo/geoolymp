-- Удаление сущности «Олимпиада»: контесты решено делать тренировочными подборками.
-- Таблицы удаляются от зависимых к корневой, поэтому внешние ключи снимаются автоматически.
DROP TABLE "OlympiadAnswer";
DROP TABLE "OlympiadAttempt";
DROP TABLE "OlympiadTask";
DROP TABLE "OlympiadGroup";
DROP TABLE "Olympiad";
