<?php
include ('conexion.php');

if($_SERVER['REQUEST_METHOD'] === 'POST'){
    $user = trim($_POST['user']);
    $password = trim($_POST['password']);
    $email = trim($_POST['email']);

    if(!empty($user) && !empty($password) && !empty($email)){
        try{
            $sql = "INSERT INTO datos (user, pass, email) VALUES (:user, :pass, :email)";

            $stmt = $conexion->prepare($sql);
            $stmt -> bindParam(':user', $user);
            $stmt -> bindParam('password', $password);
            $stmt -> bindParam('email', $email);

            $stmt->execute();
        }
    }
}


?>