import networkx as nx
import pickle

# Path to your GraphML file
graphml_path = r"C:\Users\MANOHAR\Desktop\LAB_EL\server\data\simplified_bengaluru.graphml"
# Path to save the GPickle file
gpickle_path = r"C:\Users\MANOHAR\Desktop\LAB_EL\server\data\simplified_bengaluru.gpickle"

# Load the GraphML file
G = nx.read_graphml(graphml_path)
print(f"Loaded graph with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges from {graphml_path}")
with open(gpickle_path, "wb") as f:
    pickle.dump(G, f)

print(f"Converted {graphml_path} to {gpickle_path}")