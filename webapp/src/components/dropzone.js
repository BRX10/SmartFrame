import {useCallback} from 'react'
import {useDropzone} from 'react-dropzone'

export default function Dropzone(props) {
    const onDrop = useCallback(acceptedFiles => {
        props.setFile(acceptedFiles[0])
    }, [])
    const {getRootProps, getInputProps} = useDropzone({onDrop})
    
    return (
        <div className={"w-full "+props.className}>
            <label className="inline-block mb-2 text-orange-900">{props.title}</label>
            <div className="flex items-center justify-center w-full">
                <label className="flex flex-col w-full border-4 border-orange-200 border-dashed hover:bg-orange-100 hover:border-orange-300" {...getRootProps()}>
                    <div className="flex flex-col items-center  pt-7">
                        { !props.file ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mt-4 text-orange-400 group-hover:text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                </svg>
                                <p className="pt-1 text-sm tracking-wider text-orange-400 group-hover:text-orange-600 mb-10">
                                    {props.subTitle}
                                </p>
                            </>
                        ) : (
                            <>
                                <img
                                    style={{height: "15rem"}}
                                    src={URL.createObjectURL(props.file)}
                                    alt={props.file.name}/>

                                <p className="pt-1 text-sm tracking-wider text-orange-400 group-hover:text-orange-600">
                                    {props.file.name}
                                </p>
                            </>
                        ) }
                    </div>
                    <input type="file" className="opacity-0" {...getInputProps()}/>
                </label>
            </div>
        </div>
    );
}