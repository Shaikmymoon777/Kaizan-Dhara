import JSZip from 'jszip';

export interface FileMap {
    [filename: string]: string;
}

export const downloadProjectZip = async (files: FileMap, projectName: string = 'kaizen-project') => {
    const zip = new JSZip();

    // Loop through file map and add to zip
    Object.entries(files).forEach(([path, content]) => {
        // Remove leading slash if present to avoid empty root folder issues
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        zip.file(cleanPath, content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const downloadArtifactsZip = async (artifacts: { [key: string]: any }) => {
    const zip = new JSZip();

    Object.entries(artifacts).forEach(([name, data]) => {
        const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        zip.file(`${name}.json`, content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'kaizen-dhara-artifacts.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
