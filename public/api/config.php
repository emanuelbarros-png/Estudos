<?php
// api/config.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// No InfinityFree, você pega esses dados no Painel de Controle
$host = 'localhost'; // Geralmente localhost ou o IP do SQL fornecido
$db_name = 'if0_38562145_estudos'; // Nome do seu banco
$username = 'if0_38562145'; // Seu usuário do vPanel
$password = 'sua_senha'; // Sua senha do vPanel

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(["error" => "Conexão falhou: " . $e->getMessage()]);
    exit;
}

session_start();
?>
