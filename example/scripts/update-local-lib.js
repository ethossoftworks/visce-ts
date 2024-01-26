const fs = require("fs")
const path = require("path")
const childProcess = require("child_process")

// This script might fail if it's in a folder being synced by DropBox
const libraries = [
    { name: "@ethossoftworks/interactor", directory: path.resolve(__dirname, "../../packages/interactor") },
    { name: "@ethossoftworks/interactor-react", directory: path.resolve(__dirname, "../../packages/interactor-react") },
]

const rootDir = path.dirname(__dirname, "../")

// Remove existing tarballs
fs.readdirSync(rootDir)
    .filter((file) => file.endsWith(".tgz"))
    .forEach((file) => fs.unlinkSync(path.resolve(rootDir, file)))

// Build underlying libraries
libraries.forEach((library) => {
    process.chdir(library.directory)
    childProcess.execSync("yarn build-pack", { stdio: "inherit" })
    process.chdir(rootDir)
})

// Remove existing packages
try {
    childProcess.execSync(`yarn remove ${libraries.map((library) => library.name).join(" ")}`, { stdio: "inherit" })
} catch (e) {}

// Clear Cache
childProcess.execSync(`yarn cache clean`, { stdio: "inherit" })

// Add packages back
libraries
    .flatMap((library) => {
        const libraryPath = path.resolve(library.directory, "./build/dist")
        return fs
            .readdirSync(libraryPath)
            .filter((file) => file.endsWith(".tgz"))
            .map((file) => ({ name: file, directory: libraryPath }))
    })
    .forEach((file) => {
        fs.copyFileSync(path.resolve(file.directory, file.name), path.resolve(rootDir, `./${file.name}`))
        childProcess.execSync(`yarn add ./${file.name}`, { stdio: "inherit" })
    })

// Build example project
childProcess.execSync(`yarn build`, { stdio: "inherit" })
