import * as React from "react";
import { useLocation } from 'react-router-dom'
import MenuDropDown from "../components/menuDropDown";

export default function Header() {

    function GetNamePage() {
        switch (useLocation().pathname.split("/")[1] ?? "") {
            case "":
                return "Home"
            case "frames":
                return "Cadres"
            case "new_frame":
                return "Nouveau Cadre"
            case "librarys":
                return "Bibliothéques"
            case "library":
                return "Bibliothéque"
            case "new_library":
                return "Nouvelle Bibliothéque"
            case "new_image":
                return "Nouvelle Image"
            default:
                return ""
        }
    }

    return (
        <header style={{
            height: "65px"
        }} className="flex justify-between items-center sticky top-0 z-30 bg-gray-900 bg-opacity-50 backdrop-blur backdrop-filter firefox:bg-opacity-90">
            <div style={{width: "80px"}}/>
            <h1 className="text-3xl font-extrabold text-white"> { GetNamePage() } </h1>
            <MenuDropDown/>
        </header>
    )
}