import { Project, ProjectData } from '../types';

const CURRENT_VERSION = 1;

/**
 * Save project data as JSON file download.
 */
export function saveProjectToFile(project: Project): void {
  const data: ProjectData = {
    version: CURRENT_VERSION,
    project,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Load project data from a JSON file.
 * Returns a promise that resolves with the project data.
 */
export function loadProjectFromFile(): Promise<Project> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data: ProjectData = JSON.parse(reader.result as string);
          if (!data.project || !data.project.lanes) {
            throw new Error('Invalid project file');
          }
          resolve(data.project);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}
