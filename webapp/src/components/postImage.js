import Spinner from "./spinner";
import {useEffect, useState} from "react";

export default function PostImage(props) {

    const [picture, setPicture] = useState(null);

    useEffect(() => {
        props.image
            .then(pictureLoaded => {
                setPicture(pictureLoaded);
            },
            (error) => {
                console.log(error.message);
            });
    }, [props.image]);
    
    // Grid card mode (library grid view)
    if (props.gridMode) {
        return (
            <li className="relative rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden transition-colors hover:border-zinc-600 active:opacity-80 group">
                {/* Square image */}
                <div className="aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden">
                    {picture ? (
                        <img src={picture} alt={props.title} className="w-full h-full object-cover" />
                    ) : (
                        <Spinner />
                    )}
                </div>
                {/* Label overlay */}
                <div className="px-2.5 py-2">
                    <p className="text-xs font-medium text-zinc-200 truncate">{props.title}</p>
                    {props.list.map((item, idx) => (
                        <span key={idx} className="text-[10px] text-zinc-500">{item}</span>
                    ))}
                </div>
                {props.isClick ? (
                    <button
                        onClick={() => props.onClick()}
                        className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset"
                        aria-label="Ouvrir"
                    />
                ) : null}
            </li>
        );
    }

    // List mode (default)
    return (
        <li className="relative rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden transition-colors hover:bg-zinc-800 hover:border-zinc-700 active:bg-zinc-700">
            <div className="flex items-stretch gap-0">
                {/* Thumbnail */}
                <div className="w-20 h-20 shrink-0 bg-zinc-800 flex items-center justify-center overflow-hidden">
                    {picture ? (
                        <img
                            src={picture}
                            alt={props.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Spinner />
                    )}
                </div>

                {/* Content */}
                <div className="flex flex-col justify-center px-4 py-3 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{props.title}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3">
                        {props.list.map((item, idx) => (
                            <span key={idx} className="text-xs text-zinc-500">{item}</span>
                        ))}
                    </div>
                </div>
            </div>

            {props.isClick ? (
                <button
                    onClick={() => props.onClick()}
                    className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset"
                    aria-label="Ouvrir"
                />
            ) : null}
        </li>
    );
}