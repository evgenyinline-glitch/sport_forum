<?php
/**
 * Отправка заявки с сайта «СпортФорум» на почту клуба.
 * Метод: встроенная функция mail() PHP — пароль и SMTP настраивать не нужно.
 * Хостингу достаточно поддерживать PHP 7.4+ и разрешённой функции mail().
 *
 * Ожидает POST-запрос (JSON или application/x-www-form-urlencoded) с полями:
 *   name, phone, program, location, website (honeypot)
 * Отвечает JSON: {"ok": true|false, "message": "..."}
 */

declare(strict_types=1);

const CLUB_EMAIL   = 'kfksportforum@yandex.ru';
const CLUB_EMAIL2  = 'sportforuminfo@ya.ru';
const SUBJECT_NAME = 'Сайт СпортФорум';

header('Content-Type: application/json; charset=utf-8');

function respond(bool $ok, string $message): void {
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Обрезает строку, убирает управляющие символы и переводы строк. */
function clean_text($value, int $max = 120): string {
    $value = is_string($value) ? $value : '';
    $value = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $value) ?? '';
    $value = trim($value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max, 'UTF-8');
    }
    return substr($value, 0, $max * 2);
}

/** Кодирует UTF-8 строку для заголовка письма (RFC 2047). */
function encode_header(string $value): string {
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    respond(false, 'Доступен только POST-запрос.');
}

// --- входные данные: JSON из fetch() или обычные поля формы ---
$raw  = file_get_contents('php://input');
$data = json_decode(is_string($raw) ? $raw : '', true);
if (!is_array($data)) {
    $data = $_POST;
}

// Honeypot: поле скрыто от людей — если заполнено, «успех» для робота, письмо не отправляем.
if (clean_text($data['website'] ?? '') !== '') {
    respond(true, 'Заявка принята.');
}

$name     = clean_text($data['name'] ?? '', 80);
$phone    = clean_text($data['phone'] ?? '', 30);
$program  = clean_text($data['program'] ?? '', 120);
$location = clean_text($data['location'] ?? '', 120);

$nameLen = preg_match_all('/./u', $name, $_m);
if ($nameLen === false) { $nameLen = strlen($name); }
if ($nameLen < 2) {
    respond(false, 'Укажите имя, не менее двух букв.');
}
$digits = preg_replace('/\D/', '', $phone) ?? '';
if (strlen($digits) < 10 || strlen($digits) > 15) {
    respond(false, 'Введите номер телефона: от 10 до 15 цифр.');
}
if (!filter_var(CLUB_EMAIL, FILTER_VALIDATE_EMAIL) || !filter_var(CLUB_EMAIL2, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Не настроена почта клуба.');
}
if (!function_exists('mail')) {
    respond(false, 'На сервере недоступна функция mail(). Свяжитесь с клубом по телефону +7 (925) 354-1430.');
}

$subject = 'Заявка с сайта СпортФорум — ' . $name;
$now     = date('d.m.Y H:i');

// --- тело письма (HTML; все пользовательские значения экранируются) ---
$esc = static function (string $value): string {
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
};
$row = static function (string $label, string $valueHtml): string {
    return '<tr>'
         . '<td style="padding:8px 16px;color:#8a93a6;white-space:nowrap;border-bottom:1px solid #e7eaf0">' . $label . '</td>'
         . '<td style="padding:8px 16px;font-weight:600;color:#101a2e;border-bottom:1px solid #e7eaf0">' . $valueHtml . '</td>'
         . '</tr>';
};

$telHref = 'tel:' . preg_replace('/[^\d+]/', '', $phone);

$html = '<!DOCTYPE html><html lang="ru"><body style="margin:0;background:#f2f4f8;padding:24px;font-family:Arial,Helvetica,sans-serif">'
      . '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 8px">'
      . '<h2 style="margin:0 20px 4px;font-size:20px;color:#101a2e">Заявка с сайта «СпортФорум»</h2>'
      . '<p style="margin:0 20px 18px;font-size:13px;color:#8a93a6">Получено ' . $now . '</p>'
      . '<table style="width:100%;border-collapse:collapse;font-size:15px">'
      . $row($esc('Имя'), $esc($name))
      . $row($esc('Телефон'), '<a href="' . $esc($telHref) . '" style="color:#101a2e">' . $esc($phone) . '</a>')
      . $row($esc('Направление'), $program !== '' ? $esc($program) : '—')
      . $row($esc('Площадка'), $location !== '' ? $esc($location) : '—')
      . '</table>'
      . '<p style="margin:20px;font-size:14px;color:#4c5568">Просьба: расписание, стоимость и условия первого занятия.</p>'
      . '</div></body></html>';

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: ' . encode_header(SUBJECT_NAME) . ' <' . CLUB_EMAIL . '>',
    'Cc: ' . CLUB_EMAIL2,
    'X-Mailer: PHP/' . PHP_VERSION,
];
$headersString = implode("\r\n", $headers);

// Добавляем -f (обратный адрес), если хостинг его допускает; иначе отправляем без него.
$sent = @mail(CLUB_EMAIL, encode_header($subject), $html, $headersString, '-f' . CLUB_EMAIL);
if (!$sent) {
    $sent = @mail(CLUB_EMAIL, encode_header($subject), $html, $headersString);
}

if ($sent) {
    respond(true, 'Заявка отправлена на почту ' . CLUB_EMAIL . ' и ' . CLUB_EMAIL2 . '. Мы скоро ответим.');
}
respond(false, 'Сервер не смог отправить письмо автоматически. Свяжитесь с клубом: ' . CLUB_EMAIL . ', ' . CLUB_EMAIL2 . ' или +7 (925) 354-1430.');
