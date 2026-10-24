<?php
// Copia este archivo como config.php y pon tu clave de https://aistudio.google.com/apikey
// config.php NO se sube a Git. Alternativa: definir la variable de entorno GEMINI_API_KEY.
return [
    'gemini_api_key' => '',
    'model' => 'gemini-3.5-flash', // gemini-2.5-flash ya no admite cuentas nuevas; ver modelos: GET /v1beta/models
    // 'allowed_origins' => ['http://localhost:5173'],
];
