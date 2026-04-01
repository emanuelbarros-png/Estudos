<?php
// api/auth.php
require_once 'config.php';

$data = json_decode(file_get_contents("php://input"));

if (!$data || !isset($data->action)) {
    echo json_encode(["error" => "Ação inválida"]);
    exit;
}

$action = $data->action;
$username = $data->username ?? '';
$password = $data->password ?? '';

if ($action === 'register') {
    if (empty($username) || strlen($password) < 4) {
        echo json_encode(["error" => "Dados inválidos"]);
        exit;
    }

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    
    try {
        $stmt = $pdo->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
        $stmt->execute([$username, $hashed_password]);
        echo json_encode(["success" => "Usuário criado com sucesso"]);
    } catch (PDOException $e) {
        echo json_encode(["error" => "Apelido já existe"]);
    }
}

if ($action === 'login') {
    $stmt = $pdo->prepare("SELECT id, password FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $username;
        echo json_encode([
            "success" => "Login realizado",
            "username" => $username
        ]);
    } else {
        echo json_encode(["error" => "Apelido ou senha incorretos"]);
    }
}

if ($action === 'logout') {
    session_destroy();
    echo json_encode(["success" => "Logout realizado"]);
}

if ($action === 'check') {
    if (isset($_SESSION['user_id'])) {
        echo json_encode(["authenticated" => true, "username" => $_SESSION['username']]);
    } else {
        echo json_encode(["authenticated" => false]);
    }
}
?>
