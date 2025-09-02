<?php

$server = "localhost";
$user = "root";
$password = "";
$bd = "Trapo";

try{
    $conexion = new PDo("mysql:host=$server;dbname=$db", $user, $password);
    $conexion -> setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
}catch(PDOException $e){
    echo "Error de conexion: " . $e->getMessage();
}
?>