minikube config set kubernetes-version v1.10.3
minikube config set cpus 2
minikube config set memory 8000
minikube start
minikube ssh -- sudo ip link set docker0 promisc on