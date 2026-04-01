<?php
// api/data.php
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Não autorizado"]);
    exit;
}

$user_id = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = file_get_contents("php://input");
    
    $stmt = $pdo->prepare("INSERT INTO user_data (user_id, study_data) VALUES (?, ?) 
                           ON DUPLICATE KEY UPDATE study_data = ?");
    $stmt->execute([$user_id, $data, $data]);
    
    echo json_encode(["success" => "Dados salvos"]);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare("SELECT study_data FROM user_data WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $result = $stmt->fetch();
    
    if ($result) {
        echo $result['study_data'];
    } else {
        echo json_encode(["gerais" => [], "especificos" => [], "config" => ["goalQuestions" => 100, "thresholdGreen" => 85, "thresholdYellow" => 70]]);
    }
}
?>
